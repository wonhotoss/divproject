// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import Stroke from "./Stroke";
import { StrokeAssembler } from "./StrokeAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Curve extends Stroke {
    progressFromTo = cc.v2(0.5, 1);
    widthFromTo = cc.v2(100, 100);
    vFromTo = cc.v2(1, 0);
    clockwise = true;
    createAssembler(){
        return new CurveAssembler(this);
    }
}

class CurveAssembler extends StrokeAssembler {
    constructor(private curve: Curve){
        super(30);
    }

    fillVRange(vFromTo: cc.Vec2){
        vFromTo.x = this.curve.vFromTo.x;
        vFromTo.y = this.curve.vFromTo.y;
    }

    
    fillLocalJoints(lJoints: cc.Vec2[], rJoints: cc.Vec2[]){
        console.assert(this.curve.node.height == this.curve.node.width);
        let {progressFromTo, widthFromTo, clockwise: toRight, node: {height}} = this.curve;
        let halfSize = height * 0.5;
        let axis = cc.v2(halfSize * (toRight ? 1 : -1), halfSize);
        let offset = toRight ? cc.v2(-1, 0) : cc.v2(1, 0);
        let rotation = Math.PI / 2 * (toRight ? 1 : -1);
        let rotationFromTo = cc.v2(
            cc.misc.lerp(0, rotation, progressFromTo.x),
            cc.misc.lerp(0, rotation, progressFromTo.y),
        );
        let halfWidthFromTo = widthFromTo.mul(0.5);
        for(let i = 0; i < this.joints; ++i){
            let innerProgress = i / (this.joints - 1);
            let halfWidth = cc.misc.lerp(halfWidthFromTo.x, halfWidthFromTo.y, innerProgress);
            let rotatedUnit = offset.rotate(cc.misc.lerp(rotationFromTo.x, rotationFromTo.y, innerProgress));
            let near = rotatedUnit.mul(halfSize - halfWidth).add(axis);
            let far = rotatedUnit.mul(halfSize + halfWidth).add(axis);
            lJoints[i] = toRight ? far : near;
            rJoints[i] = toRight ? near : far;
        }
    }
}