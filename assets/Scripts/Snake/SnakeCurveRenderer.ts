// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import { SnakeCurve } from "./SnakeCurve";
import { StrokeAssembler } from "./StrokeAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SnakeCurveRenderer extends cc.RenderComponent {
    @property(cc.SpriteFrame)
    bg: cc.SpriteFrame = null;
    curve: SnakeCurve = null;

    onEnable () {
        super.onEnable();
        this._activateMaterial();
        this.curve = new SnakeCurve();
        this.curve.add(0, {position: cc.v2(0, 0), angle: -90}, 30, cc.v2(50, 0));
        this.curve.add(1, {position: cc.v2(50, 0), angle: -90}, 30, cc.v2(50, 0));
        this.curve.add(2, {position: cc.v2(100, 50), angle: 0}, 30, cc.v2(0, 50));
        this.curve.add(3, {position: cc.v2(150, 100), angle: -90}, 30, cc.v2(50, 0));
        this.curve.add(4, {position: cc.v2(200, 150), angle: 0}, 30, cc.v2(0, 50));

        console.log('curve', this.curve);

        // cc.WrapMode
    }

    renderCurve(curve: SnakeCurve){
        this.curve = curve;
        this.setVertsDirty(true);
    }

    //override
    _resetAssembler () {
        this.setVertsDirty(true);
        this._assembler = new SnakeCurveAssembler();
        this._assembler.init(this);
    }

    //override
    _activateMaterial () {
        let material = this.getMaterials()[0];
        if (!material) {
            this.disableRender();
            return;
        }
        
        material = cc.MaterialVariant.create(material, this);
        this.setMaterial(0, material);
        material.setProperty('texture', this.bg.getTexture());
        this.markForRender(true);
    }
}

class SnakeCurveAssembler extends StrokeAssembler {
    constructor(){
        super(1000);
    }

    fillVRange(vFromTo: cc.Vec2){
        vFromTo.x = 1;
        vFromTo.y = 0;
    }

    
    fillLocalJoints(lJoints: cc.Vec2[], rJoints: cc.Vec2[]){
        let curve = (this._renderComp as SnakeCurveRenderer).curve;
        let timeFrom = curve.timeFrom;
        let timeTo = curve.timeTo;
        for(let ji = 0; ji < this.joints; ++ji){
            let progress = ji / (this.joints - 1);
            let {l, r} = curve.evaluate(cc.misc.lerp(timeFrom, timeTo, progress));
            let lj = lJoints[ji];
            lj.x = l.x;
            lj.y = l.y;
            let rj = rJoints[ji];
            rj.x = r.x;
            rj.y = r.y;
        }
    }
}


