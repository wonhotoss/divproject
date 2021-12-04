// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import { StrokeAssembler } from "./StrokeAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Stroke extends cc.RenderComponent {
    @property(cc.SpriteFrame)
    bg: cc.SpriteFrame = null;

    onEnable () {
        super.onEnable();
        this._activateMaterial();
    }

    createAssembler(){
        return new StrokeAssembler(1)
    }

    //override
    _resetAssembler () {
        this.setVertsDirty(true);
        this._assembler = this.createAssembler();
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

    render(){
        this.setVertsDirty(true);
    }
}