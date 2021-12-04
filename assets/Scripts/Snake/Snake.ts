// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;
import T from '../Tree';
import W from '../Tween';
import Straight from './Straight';
import Curve from './Curve';

class Matrix<T>{
    readonly buffer: {[key: number] : T} = {};
    constructor(public readonly width: number, public readonly height: number){
    }

    index(pos: cc.Vec2){
        return this.width * pos.y + pos.x;
    }

    get(pos: cc.Vec2){
        return this.buffer[this.index(pos)];
    }

    set(pos: cc.Vec2, value: T){
        this.buffer[this.index(pos)] = value;
    }

    del(pos: cc.Vec2){
        delete this.buffer[this.index(pos)];
    }
}

function makeCell(template: cc.Node){
    let cellInstance = T.make({
        bk: {},
        straight: {
            renderer: Straight,
        },
        curve: {
            renderer: Curve,
        },
    });
    cellInstance.mount(cc.instantiate(template));
    return cellInstance;
}

type cell = ReturnType<typeof makeCell>;

type segment = {
    pos: cc.Vec2,
    from: LTRB,
    to: LTRB,
    progress: number,
    length: number,
};

let LTRB2xy = {
    [LTRB.L]: cc.v2(-1, 0),
    [LTRB.T]: cc.v2(0, 1),
    [LTRB.R]: cc.v2(1, 0),
    [LTRB.B]: cc.v2(0, -1),
};

let LTRB2angle = {
    [LTRB.L]: 90,
    [LTRB.T]: 0,
    [LTRB.R]: -90,
    [LTRB.B]: 180,
};

let LTRBclockwise = {
    [LTRB.L]: LTRB.T,
    [LTRB.T]: LTRB.R,
    [LTRB.R]: LTRB.B,
    [LTRB.B]: LTRB.L,
};

function interpolatePosAngle(term: segment, cell: cell, auxProgress: number = term.progress){
    let result = {
        position: cell.node.position,
        angle: 0,
    };

    let hw = cell.node.width / 2;
    let hh = cell.node.height / 2;
    let orgProgress = term.progress;
    term.progress = auxProgress;

    if(LTRB.opposite(term.from) == term.to){
        let offset = LTRB2xy[term.from]
            .lerp(LTRB2xy[term.to], term.progress)
            .multiply(cc.v2(hw, hh));
        result.position = cell.node.position.add(cc.v3(offset.x, offset.y));
        result.angle = LTRB2angle[term.to];
    }
    else{
        let origin = LTRB2xy[term.from].add(LTRB2xy[term.to]);
        let diff = LTRB2xy[term.to].mul(-1);
        // counter clockwise
        let ccwise = LTRBclockwise[term.from] == term.to;
        let radDiff = Math.PI / 2 * (ccwise ? 1 : -1) * term.progress;
        let rotatedDiff = diff.rotate(radDiff);
        let offset = origin.add(rotatedDiff).multiply(cc.v2(hw, hh));
        result.position = cell.node.position.add(cc.v3(offset.x, offset.y));

        let angleFrom = LTRB2angle[LTRB.opposite(term.from)];
        result.angle = angleFrom + cc.misc.radiansToDegrees(radDiff);
    }
    term.progress = orgProgress;
    return result;
}

@ccclass
export default class Snake extends cc.Component {
    @property(cc.Vec2)
    cellCounts: cc.Vec2 = cc.v2(7, 12);

    @property(cc.Integer)
    cellSize: number = 0;

    @property(cc.Integer)
    speed: number = 1;

    @property(cc.Integer)
    startWidth: number = 80;

    @property(cc.Integer)
    endWidth: number = 20;

    @property(cc.Float)
    textureDistance = 100;

    bind = T.make({
        stage: {
            grid: {
            },
            cell: {
            },
            head: {
            },
            tail: {
            },
            apple: {
                apple: {
                },
                shadow: {
                },
            },
        },
        popup: {
            retry: {
            },
        }
    });

    cells: Matrix<cell>;
    fruits: cc.Vec2[];

    head: segment;
    tail: segment;
    bodies: segment[];
    input: LTRB = undefined;
    gameend = true;
    digestingFruits = 0;

    start(){
        this.bind.mount(this.node);

        let {stage} = this.bind;

        stage.cell.node.setContentSize(this.cellSize, this.cellSize);
        this.node.setContentSize(this.cellSize * this.cellCounts.x, this.cellSize * this.cellCounts.y);

        this.cells = new Matrix<cell>(this.cellCounts.x, this.cellCounts.y);
        for(let row = 0; row < this.cellCounts.y; ++row){
            for(let col = 0; col < this.cellCounts.x; ++col){
                let cellInstance = makeCell(stage.cell.node);
                cellInstance.node.parent = stage.grid.node;
                cellInstance.node.position = cc.v3(
                    -this.node.width / 2 + this.cellSize * col + this.cellSize / 2,
                    -this.node.height / 2 + this.cellSize * row + this.cellSize / 2,
                );
                this.cells.set(cc.v2(col, row), cellInstance);
            }
        }
        stage.cell.node.active = false;

        this.fruits = [];
        
        this.gameloop();
        this.FPS();

        window['snake'] = this;
    }

    startgame(){
        this.head = {
            pos: cc.v2(0, 5),
            from: LTRB.B,
            to: LTRB.T,
            progress: 1,
            length: this.cellSize,
        };

        this.bodies = [
            { 
                pos: cc.v2(0, 4),
                from: LTRB.B,
                to: LTRB.T,
                progress: 1,
                length: this.cellSize,
            },
            { 
                pos: cc.v2(0, 3),
                from: LTRB.B,
                to: LTRB.T,
                progress: 1,
                length: this.cellSize,
            },
            { 
                pos: cc.v2(0, 2),
                from: LTRB.B,
                to: LTRB.T,
                progress: 1,
                length: this.cellSize,
            },
            { 
                pos: cc.v2(0, 1),
                from: LTRB.B,
                to: LTRB.T,
                progress: 1,
                length: this.cellSize,
            },
        ];

        this.tail = {
            pos: cc.v2(0, 0),
            from: LTRB.B,
            to: LTRB.T,
            progress: 0,
            length: this.cellSize,
        };

        this.digestingFruits = 0
    }

    getSegmentLength(seg: segment, auxProgress: number){
        let whole = LTRB.opposite(seg.from) == seg.to ? this.cellSize : this.cellSize * Math.PI / 4;
        return whole * auxProgress;
    }

    update(dt: number){
        let {head, tail, bodies} = this;
        // do move snake only
        console.assert(head.from != head.to);
        console.assert(tail.from != tail.to);

        // update head
        let offset = this.speed * dt;
        
        head.progress += offset;
        head.length = this.getSegmentLength(head, Math.min(1, head.progress));
        while(!this.gameend && head.progress > 1){
            offset = 1 - head.progress;
            bodies.unshift({
                pos: head.pos,
                from: head.from,
                to: head.to,
                progress: 1, 
                length: head.length,
            });
            head.pos = head.pos.add(LTRB2xy[head.to]);
            head.from = LTRB.opposite(head.to);
            head.to = head.to;
            if(this.input != undefined){
                if(this.input != head.from){
                    head.to = this.input;
                }
                this.input = undefined;
            }
            head.progress = offset;
            head.length = this.getSegmentLength(head, Math.min(1, head.progress));

            let fIndex = this.fruits.findIndex(f => f.equals(head.pos));
            if(fIndex >= 0){
                this.fruits.splice(fIndex, 1);
                this.digestingFruits += 1;
            }
            
            if(head.pos.x < 0
                || head.pos.y < 0
                || head.pos.x >= this.cellCounts.x
                || head.pos.y >= this.cellCounts.y
                || bodies.some(b => b.pos.equals(head.pos))){
                this.gameend = true;
            }
        }

        // update tail
        offset = this.speed * dt;
        if(this.digestingFruits){
            if(this.digestingFruits > offset){
                this.digestingFruits -= offset;
                offset = 0;
            }
            else{
                offset -= this.digestingFruits;
                this.digestingFruits = 0;
            }
        }

        tail.progress += offset;
        tail.length = this.getSegmentLength(tail, 1 - Math.min(1, tail.progress));
        while(!this.gameend && tail.progress > 1){
            offset = 1 - tail.progress;
            console.assert(bodies.length > 0);
            let popped = bodies.pop();
            tail.pos = popped.pos;
            tail.from = popped.from;
            tail.to = popped.to;
            tail.progress = offset;
            tail.length = this.getSegmentLength(tail, 1 - Math.min(1, tail.progress));
        }
    }

    async renderSnake(){
        let wholeDistance = 0;
        let {head, tail, bodies: bodies, bind, cells} = this;
        let renderCommon = (distanceFrom: number, seg: segment, renderer: Curve | Straight) => {
            let distanceFromTo = cc.v2(
                distanceFrom / wholeDistance,
                (distanceFrom + seg.length) / wholeDistance,
            );
            renderer.widthFromTo = cc.v2(
                cc.misc.lerp(this.startWidth, this.endWidth, distanceFromTo.x),
                cc.misc.lerp(this.startWidth, this.endWidth, distanceFromTo.y),
            );

            // TODO: loop
            renderer.vFromTo = cc.v2(
                distanceFrom / this.textureDistance,
                (distanceFrom + seg.length) / this.textureDistance,
            );

            renderer.node.angle = LTRB2angle[seg.to];
            renderer.render();
            renderer.node.active = true;
        };

        let getClockwise = (seg: segment) => {
            return LTRBclockwise[seg.from] != seg.to;
        };
        
        while(!this.gameend){
            for(let y = 0; y < this.cellCounts.y; ++y){
                for(let x = 0; x < this.cellCounts.x; ++x){
                    let cell = this.cells.get(cc.v2(x, y));
                    let pos = cc.v2(x, y);
                    let occupied = head.pos.equals(pos)
                        || bodies.some(b => b.pos.equals(pos))
                        || tail.pos.equals(pos);
                    cell.bk.node.color = occupied ? cc.Color.RED : cc.Color.WHITE;

                    cell.straight.node.active = false;
                    cell.curve.node.active = false;
                }
            }

            wholeDistance = head.length + bodies.reduce((acc, b) => acc + b.length, 0) + tail.length;
            
            let headCell = this.cells.get(head.pos);
            let headPA = interpolatePosAngle(head, headCell);
            bind.stage.head.node.position = headPA.position;
            bind.stage.head.node.angle = headPA.angle;

            let tailCell = this.cells.get(tail.pos);
            let tailPA = interpolatePosAngle(tail, tailCell);
            bind.stage.tail.node.position = tailPA.position;
            bind.stage.tail.node.angle = tailPA.angle;
            
            let distance = 0;
            
            // head
            if(LTRB.opposite(head.from) == head.to){
                let straight = headCell.straight.renderer;
                straight.progressFromTo = cc.v2(1 -head.progress, 1);
                renderCommon(distance, head, straight);
            }
            else{
                let curve = headCell.curve.renderer;
                curve.progressFromTo = cc.v2(1 -head.progress, 1);
                curve.clockwise = getClockwise(head);
                renderCommon(distance, head, curve);
            }

            distance += head.length;

            // body
            for(let i = 0; i < bodies.length; ++i){
                let body = bodies[i];
                let cell = cells.get(body.pos);

                if(LTRB.opposite(body.from) == body.to){
                    let straight = cell.straight.renderer;
                    straight.progressFromTo = cc.v2(0, 1);
                    renderCommon(distance, body, straight);
                }
                else{
                    let curve = cell.curve.renderer;
                    curve.progressFromTo = cc.v2(0, 1);
                    curve.clockwise = getClockwise(body);
                    renderCommon(distance, body, curve);
                }
                
                distance += body.length;
            }

            // tail
            if(LTRB.opposite(tail.from) == tail.to){
                let straight = tailCell.straight.renderer;
                straight.progressFromTo = cc.v2(0, 1 - tail.progress);
                renderCommon(distance, tail, straight);
            }
            else{
                let curve = tailCell.curve.renderer;
                curve.clockwise = getClockwise(tail);
                renderCommon(distance, tail, curve);
            }

            await W.waitFrame(this.node);
        }
    }

    async updateInput(){
        while(!this.gameend){
            let keycode = await new Promise(resolve => {
                cc.systemEvent.on(
                    cc.SystemEvent.EventType.KEY_UP, 
                    (event) => resolve(event.keyCode), 
                    this
                );
            });

            cc.systemEvent.removeAll(this);

            switch(keycode) {
                case cc.macro.KEY.up:
                {
                    this.input = LTRB.T;
                }break;
                case cc.macro.KEY.down:
                {
                    this.input = LTRB.B;
                }break;
                case cc.macro.KEY.left:
                {
                    this.input = LTRB.L;
                }break;
                case cc.macro.KEY.right:
                {
                    this.input = LTRB.R;
                }break;
            }

            console.log('input', LTRB[this.input]);
        }
    }

    async dropFruits(){
        this.fruits = [];

        let candidates: cc.Vec2[] = [];
        for(let y = 0; y < this.cellCounts.y; ++y){
            for(let x = 0; x < this.cellCounts.x; ++x){
                candidates.push(cc.v2(x, y));
            }
        }

        // shuffle
        for (let i = candidates.length; i; i -= 1) {
            let j = Math.floor(Math.random() * i);
            let x = candidates[i - 1];
            candidates[i - 1] = candidates[j];
            candidates[j] = x;
        }

        while(!this.gameend){
            await W.waitMS(1000, this.node);
            if(this.fruits.length < 2){
                // find first available
                let available = candidates.findIndex(c => 
                    !this.fruits.some(f => f.equals(c))
                    && !this.head.pos.equals(c)
                    && !this.bodies.some(b => b.pos.equals(c))
                    && !this.tail.pos.equals(c)
                );

                if(available >= 0){
                    let pos = candidates[available];
                    candidates.splice(available, 1);
                    candidates.push(pos);
                    this.fruits.push(pos);
                }
            }
        }
    }

    async renderFruits(){
        let {stage, stage: {apple}} = this.bind;
        apple.node.active = false;
        let apples = new Matrix<typeof apple>(this.cellCounts.x, this.cellCounts.y);
        let instanciate = (pos: cc.Vec2) => {
            let clone = T.clone(apple);
            clone.node.active = true;
            clone.node.parent = stage.node;
            clone.node.position = this.cells.get(pos).node.position;
            return clone;
        };
        while(!this.gameend){
            let lastFruits = this.fruits.slice();
            while(lastFruits.length == this.fruits.length
                && lastFruits.every((lf, i) => lf.equals(this.fruits[i]))){
                await W.waitFrame(this.node);
            }
            
            let eatens = lastFruits.filter(lf => !this.fruits.some(f => f.equals(lf)));
            for(let fruit of eatens){
                apples.get(fruit).node.destroy();
                apples.del(fruit);
                // let instance = cc.instantiate(apple.node);
                // TODO: effect & scoring
            }
            
            let dropped = this.fruits.filter(f => !lastFruits.some(lf => lf.equals(f)));
            for(let fruit of dropped){
                let bind = instanciate(fruit);
                apples.set(fruit, bind);
                W.jump_in(bind.apple.node);
                W.zoom_in(bind.shadow.node);
            }
        }

        while(this.gameend) {
            await W.waitFrame(this.node);
        }
        for(let apple of Object.values(apples.buffer)){
            apple.node.destroy();
        }
    }

    async gameloop(){
        let {popup} = this.bind;
        popup.node.position = cc.Vec3.ZERO;
        popup.node.active = false;
        while(true){
            this.gameend = false;
            this.startgame();
            this.dropFruits();
            this.renderFruits();
            this.renderSnake();
            this.updateInput();
            
            while(cc.isValid(this.node) && !this.gameend){
                await W.waitFrame(this.node);
            }

            console.log('gameend');

            popup.node.active = true;
            await W.enter({
                [LTRB.T]: [popup.node],
            });

            let btn = await T.waitClick(popup.retry.node);
            await W.outer({
                [LTRB.T]: [popup.node],
            });
            popup.node.active = false;
        }
    }

    async FPS(){
        while(cc.isValid(this.node)){
            let totalFramesFrom = cc.director.getTotalFrames();
            let totalTimeFrom = cc.director.getTotalTime();
            await W.waitMS(5000, this.node);
            let totalFrames = cc.director.getTotalFrames() - totalFramesFrom;
            let totalTime = cc.director.getTotalTime() - totalTimeFrom;
            let avgfps = totalFrames / totalTime * 1000;
            console.log('FPS', avgfps);
        }
    }
}
