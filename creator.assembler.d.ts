declare namespace cc {	
    declare let gfx: any;
    export class RenderData {
        init(assembler: cc.Assembler);
        vDatas;
        iDatas;
        createData(idx: number, verticeFloats: number, indicesCount: number);
        uintVDatas;
    }
    export class Assembler {
        _renderComp: RenderComponent;
        init(comp: RenderComponent): void;
        updateRenderData(comp: RenderComponent): void;
        fillBuffers(comp: RenderComponent, renderer): void;
    }

    export class Assembler2D extends Assembler {
        _local: Array;
        _renderData: any;
        uvOffset: number;
        floatsPerVert: number;
        updateWorldVerts(comp: RenderComponent): void
    }

    export interface RenderComponent{
		setVertsDirty(enable: boolean): void;
		markForRender(enable: boolean): void;
		disableRender(): void;
		_assembler: any;
    }

    export namespace Material{
        export let getInstantiatedMaterial: (mat:Material, renderComponent:any) => Material;
    }

    export namespace renderer{
        export let _handle: any;
    }

    export interface AnimationCurve{
        keyFrames: {
            inTangent: number,
            outTangent: number,
            time: number,
            value: number,
        }[];
        preWrapMode: number;
        postWrapMode: number;
        evaluate(t: number): number;
        evaluate_slow(t: number): number;
    }
}


