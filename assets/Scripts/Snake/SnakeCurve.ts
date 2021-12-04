type veclike = {x: number, y: number}
export class SnakeCurve{
    private lx = new cc.AnimationCurve();
    private ly = new cc.AnimationCurve();
    private rx = new cc.AnimationCurve();
    private ry = new cc.AnimationCurve();
    private dirty = true;
    constructor(){
        this.clear();
    }

    add(time: number, positionAngle: {position: veclike, angle: number}, width: number, tangent: veclike){
        let c = cc.v2(positionAngle.position.x, positionAngle.position.y);
        let l = cc.v2(-width / 2, 0).rotate(cc.misc.degreesToRadians(positionAngle.angle)).add(c);
        let r = cc.v2(width / 2, 0).rotate(cc.misc.degreesToRadians(positionAngle.angle)).add(c);
        this.lx.keyFrames.push({
            time: time,
            value: l.x,
            inTangent: tangent.x,
            outTangent: tangent.x,
        });

        this.rx.keyFrames.push({
            time: time,
            value: r.x,
            inTangent: tangent.x,
            outTangent: tangent.x,
        });

        this.ly.keyFrames.push({
            time: time,
            value: l.y,
            inTangent: tangent.y,
            outTangent: tangent.y,
        });

        this.ry.keyFrames.push({
            time: time,
            value: r.y,
            inTangent: tangent.y,
            outTangent: tangent.y,
        });
        
        this.dirty = true;
    }

    clear(){
        this.lx.keyFrames = [];
        this.ly.keyFrames = [];
        this.rx.keyFrames = [];
        this.ry.keyFrames = [];
    }

    private clearDirty(){
        if(this.dirty){
            this.lx.keyFrames.sort((x, y) => x.time - y.time);
            this.ly.keyFrames.sort((x, y) => x.time - y.time);
            this.rx.keyFrames.sort((x, y) => x.time - y.time);
            this.ry.keyFrames.sort((x, y) => x.time - y.time);
            this.dirty = false;
        }
    }

    evaluate(time: number){
        this.clearDirty();
        time = Math.min(this.timeTo * 0.99999999, time);       // engine bug: last keyframe ignored.
        return {
            // l: cc.v2(this.lx.evaluate(time), this.ly.evaluate(time)),
            // r: cc.v2(this.rx.evaluate(time), this.ry.evaluate(time)),
            l: cc.v2(this.lx.evaluate_slow(time), this.ly.evaluate_slow(time)),
            r: cc.v2(this.rx.evaluate_slow(time), this.ry.evaluate_slow(time)),
        };
    }

    get timeFrom(){
        this.clearDirty();
        return this.lx.keyFrames[0].time;
    }

    get timeTo(){
        this.clearDirty();
        return this.lx.keyFrames[this.lx.keyFrames.length - 1].time;
    }
}