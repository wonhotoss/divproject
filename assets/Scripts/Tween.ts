import { getCurrentTime, unlerp, numberWithCommas } from './Utils';

const { ccclass, property } = cc._decorator;

export const ERROR_DESTROYED_DURING_ANIMATION = {
    message: 'DESTROYED_DURING_ANIMATION',
};

const DEFAULT_ANIM_DURATION = 250;

var tweenUpdators = {
    scale: function (tween, progress) {
        progress *= progress;
        tween.DO.scale = cc.misc.lerp(tween.from, tween.to, progress);
    },

    position: function (tween, progress) {
        progress *= progress;
        tween.DO.position = new cc.Vec3(
            cc.misc.lerp(tween.from.x, tween.to.x, progress),
            cc.misc.lerp(tween.from.y, tween.to.y, progress),
        );
    },

    opacity: function (tween, progress) {
        progress *= progress;
        tween.DO.opacity = cc.misc.lerp(tween.from, tween.to, progress);
    },

    blink: function (tween, progress) {
        progress = Math.sin(progress * Math.PI);
        tween.DO.opacity = cc.misc.lerp(0, 1, progress);
    },
}

function ensureValid(node: cc.Node): cc.Node{    
    if(!cc.isValid(node)){
        throw ERROR_DESTROYED_DURING_ANIMATION;
    }
    return node;
}

@ccclass
export default class Tween extends cc.Component {
    private static instance: Tween;

    now: number = 0;
    gameNow: number = 0;
    speed: number = 1;
    tweens: any[] = [];

    static get Instance() { return this.instance; }

    static loop(DO, interval, cb, suppressWarning) {
        this.add(
            DO,
            undefined,
            undefined,
            { duration: interval, suppressWarning },
            () => { })
            .then(() => {
                cb();
                this.loop(DO, interval, cb, suppressWarning);
            });
    }

    static add(node: cc.Node, from, to, option, updator): Promise<any> {
        //let game = node.game;
        if (cc.isValid(node)) {   // aware destroyed
            option = Object.assign({
                duration: DEFAULT_ANIM_DURATION,
                delay: 0,
            }, option);

            if (!this.instance) {
                this.instance = (new cc.Node('Tween')).addComponent(Tween);
                cc.director.getScene().addChild(this.instance.node);
                cc.game.addPersistRootNode(this.instance.node);
            }

            return new Promise((resolve, reject) => {
                let tween = {
                    DO: node,
                    from,
                    to,
                    timeFrom: this.instance.now + option.delay,
                    timeTo: this.instance.now + option.delay + option.duration,
                    resolve,
                    reject,
                    updator,
                    suppressWarning: option.suppressWarning ? true : false,
                };

                tween.updator(tween, 0);

                let tweens = this.instance.tweens;

                // collection is sorted by timeTo ascending.
                let iLater = tweens.findIndex(t => t.timeTo > tween.timeTo);
                if (iLater >= 0) {
                    tweens.splice(iLater, 0, tween);
                }
                else {
                    tweens.push(tween);
                }
            });
        }

        return Promise.reject(ERROR_DESTROYED_DURING_ANIMATION);
    }

    // TODO: use dt
    update(dt) {
        let currentTime = getCurrentTime();
        if (currentTime > this.gameNow) {
            let elapsed = currentTime - this.gameNow;
            this.now += elapsed * this.speed;
            this.gameNow = currentTime;
        }

        while (this.tweens.length) {
            let tween = this.tweens[0];
            if (tween.timeTo > this.now) {
                break;
            }
            else {
                this.tweens.shift();
                if (cc.isValid(tween.DO)) {  // check destroyed before update
                    tween.updator(tween, 1);
                    tween.resolve();
                }
                else {
                    if (!tween.suppressWarning){
                        //tween.reject(ERROR_DESTROYED_DURING_ANIMATION);
                    }
                }
            }
        }

        let existDestroyed = false;

        for (let i in this.tweens) {
            let tween = this.tweens[i];
            if (cc.isValid(tween.DO)) {  // check destroyed before update
                let progress = Math.max(0, unlerp(tween.timeFrom, tween.timeTo, this.now));
                tween.updator(tween, progress);
            }
            else {
                existDestroyed = true;
                if (!tween.suppressWarning){
                    //tween.reject(ERROR_DESTROYED_DURING_ANIMATION);
                }
            }
        }

        if (existDestroyed) {
            this.tweens = this.tweens.filter(t => cc.isValid(t.DO));
        }
    }

    static getExtents(node: cc.Node) {
        let wp = node.convertToWorldSpaceAR(cc.Vec3.ZERO);
        let wbb = node.getBoundingBoxToWorld();
        return {
            l: wp.x - wbb.x,
            t: wbb.y + wbb.height - wp.y,
            r: wbb.x + wbb.width - wp.x,
            b: wp.y - wbb.y,
        };
    }

    static jump(DO: cc.Node, from, to, options) {
        return this.add(
            DO,
            from,
            to,
            options,
            this._updateJump,
        );
    }

    static jump_in(DO: cc.Node, options = {}) {
        return this.jump(DO, { from: 0, to: 1, height: Tween.getExtents(DO).b, y: DO.y }, undefined, options);
    }

    static jump_out(DO: cc.Node, options = {}) {
        return this.jump(DO, { from: 1, to: 0, height: Tween.getExtents(DO).b, y: DO.y }, undefined, options);
    }

    static _updateJump(tween, progress) {
        progress = cc.misc.lerp(tween.from.from, tween.from.to, progress);
        let radFrom = 0;
        let radTo = Math.PI * 0.75;
        let rad = cc.misc.lerp(radFrom, radTo, progress);
        let scale = unlerp(0, Math.sin(radTo), Math.sin(rad));
        tween.DO.scale = scale;

        console.log(tween.from.height);

        tween.DO.y = tween.from.y - (1 - scale) * tween.from.height;
    }

    static _updateAppearAnim(tween, progress) {
        progress = Math.sin(cc.misc.lerp(-Math.PI * 0.5, Math.PI * 0.75, progress));
        progress = unlerp(-1, Math.sin(Math.PI * 0.75), progress);

        let node = tween.DO as cc.Node;
        node.setPosition(
            cc.misc.lerp(tween.from.x, tween.to.x, progress),
            cc.misc.lerp(tween.from.y, tween.to.y, progress),
        );
        node.setScale(
            progress,
            progress,
        );
    }

    static appearEffect(DO: cc.Node, option = {}) {
        let to = DO.position.clone();
        let from = cc.v3(to.x, to.y + DO.height * 0.5);
        return this.add(
            DO,
            from,
            to,
            option,
            this._updateAppearAnim
        );
    }

    static slide(DO: cc.Node, from, to, option = {}) {
        return this.add(
            DO,
            from.clone(),
            to.clone(),
            option,
            tweenUpdators.position);
    }

    static slide_x(DO: cc.Node, to, options = {}) {
        return this.slide(
            DO,
            DO.position,
            new cc.Vec2(to, DO.y),
            options,
        );
    }

    static slide_y(DO: cc.Node, to, options = {}) {
        return this.slide(
            DO,
            DO.position,
            new cc.Vec2(DO.x, to),
            options,
        );
    }

    static getPockets(node: cc.Node): { [key in LTRB]: cc.Vec3 } {
        let wp = node.convertToWorldSpaceAR(cc.Vec3.ZERO);
        let extents = this.getExtents(node);
        let parent = node.parent;
        let world = getVisibleWorld();

        return {
            [LTRB.L]: parent.convertToNodeSpaceAR(new cc.Vec3(world.x - extents.r, wp.y, wp.z)),
            [LTRB.T]: parent.convertToNodeSpaceAR(new cc.Vec3(wp.x, world.y + world.height + extents.b, wp.z)),
            [LTRB.R]: parent.convertToNodeSpaceAR(new cc.Vec3(world.x + world.width + extents.l, wp.y, wp.z)),
            [LTRB.B]: parent.convertToNodeSpaceAR(new cc.Vec3(wp.x, world.y - extents.t, wp.z)),
        };
    }

    // TODO: constraint ltrb using keyof
    static slide_enter(node: cc.Node, ltrb: LTRB, options = {}) {
        return this.slide(
            node,
            this.getPockets(node)[ltrb],
            node.position,
            options,
        );
    }

    // TODO: constraint ltrb using keyof
    static slide_outer(node: cc.Node, ltrb: LTRB, options = {}) {
        let old = node.position;
        return this.slide(
            node,
            node.position,
            this.getPockets(node)[ltrb],
            options,
        ).then(() => { if (!options['stay']) node.position = old });
    }

    static fade(DO: cc.Node, from: number, to: number, option = {}) {
        return this.add(
            DO,
            from,
            to,
            option,
            tweenUpdators.opacity);
    }

    static fade_in(DO: cc.Node, option = {}) {
        return this.fade(
            DO,
            0,
            DO.opacity,
            option
        );
    }

    static fade_out(DO: cc.Node, option = {}) {
        let old = DO.opacity;
        return this.fade(
            DO,
            DO.opacity,
            0,
            option
        ).then(() => DO.opacity = old);
    }

    static zoom(DO: cc.Node, from: number, to: number, option = {}) {
        return this.add(
            DO,
            from,
            to,
            option,
            tweenUpdators.scale);
    }

    static enter(nodes: { [key in LTRB | 'bg']?: cc.Node[] }, option = {}) {
        let promises = [];
        if (nodes.bg) {
            for (let node of nodes.bg) {
                promises.push(this.fade_in(node, option));
            }
        }

        for (let ltrb of [LTRB.L, LTRB.T, LTRB.R, LTRB.B]) {
            if (nodes[ltrb]) {
                for (let node of nodes[ltrb]) {
                    promises.push(this.slide_enter(node, ltrb, option));
                }
            }
        }
        return Promise.all(promises);
    }

    static outer(nodes: { [key in LTRB | 'bg']?: cc.Node[] }, option = {}) {
        let promises = [];
        if (nodes.bg) {
            for (let node of nodes.bg) {
                promises.push(this.fade_out(node, option));
            }
        }

        for (let ltrb of [LTRB.L, LTRB.T, LTRB.R, LTRB.B]) {
            if (nodes[ltrb]) {
                for (let node of nodes[ltrb]) {
                    promises.push(this.slide_outer(node, ltrb, option));
                }
            }
        }
        return Promise.all(promises);
    }

    
    static zoom_in(node: cc.Node, option = {}) {
        return this.zoom(
            node,
            0,
            ensureValid(node).scale,
            option
        );
    }

    static zoom_out(node: cc.Node, option = {}) {
        let old = node.scale;
        return this.zoom(
            node,
            ensureValid(node).scale,
            0,
            option
        ).then(() => node.scale = old);
    }

    static throw(from: cc.Node, to: cc.Node, effect: cc.Node, options) {
        let posFrom = effect.parent.convertToNodeSpaceAR(from.convertToWorldSpaceAR(cc.Vec2.ZERO));
        let posTo = effect.parent.convertToNodeSpaceAR(to.convertToWorldSpaceAR(cc.Vec2.ZERO));
        options = Object.assign({
            scaleFrom: effect.scale,
            scaleTo: effect.scale,
        }, options);

        return this.add(
            effect,
            { position: posFrom, scale: options.scaleFrom },
            { position: posTo, scale: options.scaleTo },
            options,
            this._updateThrowAnim
        );
    }

    static _updateThrowAnim(tween, progress) {
        progress *= progress;
        let diff = tween.to.position.sub(tween.from.position);
        let rotatedDiff = diff.rotate(-Math.PI / 2 * (1 - progress)).mul(progress);
        tween.DO.position = tween.from.position.add(rotatedDiff);
        tween.DO.scale = cc.misc.lerp(tween.from.scale, tween.to.scale, progress);
    }

    private static createSpriteEffect(spriteFrame: cc.SpriteFrame){
        let effect = new cc.Node('effect');
        cc.director.getScene().addChild(effect);    // TODO: effect layer?
        let sprite = new cc.Node('sprite').addComponent(cc.Sprite);
        sprite.node.parent = effect;
        sprite.spriteFrame = spriteFrame;
        return effect;
    }

    static async throw_sprite(from: cc.Node, to: cc.Node, spriteFrame: cc.SpriteFrame, options/*: {trailTemplate?: cc.Node}*/) {
        let effect = this.createSpriteEffect(spriteFrame);
        if(options.trailTemplate){
            let trail = cc.instantiate(options.trailTemplate as cc.Node);
            trail.active = true;
            trail.parent = effect;
            trail.position = cc.Vec3.ZERO;
            trail.setSiblingIndex(0);
        }
        await this.throw(from, to, effect, options);
        effect.destroy();
    }

    static async boomerang(target: cc.Node, from: cc.Node, to: cc.Node) {
        this.add(
            target,
            undefined,
            undefined,
            { duration: 1000 },
            (tween, progress) => {
                tween.DO.angle = -360 * progress * progress * progress;
            },
        );
        await this.throw(
            from,
            to,
            target,
            { duration: 1000 }
        );
    }

    static async boomerang_sprite(spriteFrame: cc.SpriteFrame, from: cc.Node, to: cc.Node) {
        let effect = this.createSpriteEffect(spriteFrame);
        await this.boomerang(effect, from, to);
        effect.destroy();
    }

    static async rotateTo(node: cc.Node, currentRotation, targetRotation, options?) {
        return this.add(
            node,
            undefined,
            undefined,
            { duration: options.duration ? options.duration : 1000 },
            (tween, progress) => {
                progress = this.easeInOutQuart(progress)
                tween.DO.angle = cc.misc.lerp(currentRotation, targetRotation, progress);
            },
        )
    }

    static easeInOutQuart(x: number): number {
        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    static emphasize(node: cc.Node, options?) {
        let width = node.width || 100;
        let zoomedScale = (width + 20) / width;
        if (options && ('scale' in options)) {
            zoomedScale = options.scale;
        }

        options = Object.assign({
            scale: zoomedScale,
            duration: 1000,
            delay: 0,
        }, options);

        return this.add(
            node,
            undefined,
            options.scale,
            options,
            this._updateEmphasize
        );
    }

    static _updateEmphasize(tween, progress) {
        progress = cc.misc.clamp01(unlerp(0, 0.25, progress));
        let scale = cc.misc.lerp(1, tween.to, Math.sin(progress * Math.PI));
        tween.DO.scale = scale;
    }

    static amountText(label: cc.Label, from: number, to: number) {
        let duration = Math.min(Math.abs(to - from), 1000);
        return this.add(
            label.node,
            from,
            to,
            { duration },
            (tween, progress) => label.string = numberWithCommas(Math.floor(cc.misc.lerp(tween.from, tween.to, progress)))
        );
    }

    static async infinite(node: cc.Node, update: () => any) {
        while (cc.isValid(node)) {
            await this.add(node, undefined, undefined, undefined, update);
        }
    }


    static waitMS(ms, node: cc.Node) {
        return this.add(
            node, undefined, undefined, { duration: ms }, () => {}
        );
    }

    static async waitFrame(node: cc.Node){
        let frames = cc.director.getTotalFrames();
        while(cc.director.getTotalFrames() == frames){
            await this.waitMS(0, node);
        }
    }

    static async floating(DO: cc.Node, options: { y?: number } = {}) {
        options = Object.assign({
            duration: 1000,
            y: 20,
        }, options);

        while (cc.isValid(DO)) {
            await this.add(
                DO,
                DO.position.y,
                DO.position.y + options.y,
                options,
                this._updateFloating
            );
        }
    }

    static _updateFloating(tween, progress) {
        progress = (-Math.cos(progress * Math.PI * 2) + 1) / 2;
        tween.DO.y = (cc.misc.lerp(tween.from, tween.to, progress));
    }
}

// TODO: globalize
window['W'] = Tween;
//