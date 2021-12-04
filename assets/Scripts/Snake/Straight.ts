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
export default class Straight extends Stroke {
    progressFromTo = cc.v2(0, 1);
    widthFromTo = cc.v2(100, 100);
    vFromTo = cc.v2(1, -1);
    createAssembler(){
        return new StraightAssembler(this);
    }
}

class StraightAssembler extends StrokeAssembler {
    constructor(private straight: Straight){
        super(2);
    }

    fillVRange(vFromTo: cc.Vec2){
        vFromTo.x = this.straight.vFromTo.x;
        vFromTo.y = this.straight.vFromTo.y;
    }

    
    fillLocalJoints(lJoints: cc.Vec2[], rJoints: cc.Vec2[]){
        let {progressFromTo, widthFromTo, node: {height}} = this.straight;
        let lt = lJoints[0];
        let rt = rJoints[0];
        let lb = lJoints[1];
        let rb = rJoints[1];

        lt.x = -widthFromTo.x * 0.5;
        lt.y = cc.misc.lerp(height * 0.5, height * -0.5, progressFromTo.x);
        rt.x = -lt.x;
        rt.y = lt.y;

        lb.x = -widthFromTo.y * 0.5;
        lb.y = cc.misc.lerp(height * 0.5, height * -0.5, progressFromTo.y);
        rb.x = -lb.x;
        rb.y = lb.y;
    }
}


