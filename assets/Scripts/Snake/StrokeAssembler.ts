export class StrokeAssembler extends cc.Assembler {
    readonly uvOffset = 2;
    readonly colorOffset = 4;
    readonly floatsPerVert = 5;
    private renderData: cc.RenderData = null;
    lJoints: cc.Vec2[];
    rJoints: cc.Vec2[];
    vFromTo: cc.Vec2;

    get verticesCount(){
        return this.joints * 3;
    }

    get indicesCount(){
        return (this.joints - 1) * 2 * 2 * 3;
    }

    get verticesFloats() {
        return this.verticesCount * this.floatsPerVert;
    }

    constructor(readonly joints: number){
        super();

        this.lJoints = [];
        this.rJoints = [];
        for(let ji = 0; ji < this.joints; ++ji){
            this.lJoints.push(cc.v2(100, ji * 0.1));
            this.rJoints.push(cc.v2(100, ji * 0.1));
        }
        this.vFromTo = cc.v2(1, 0);
    }

    //override
    init (comp) {
        super.init(comp);
        this.renderData = new cc.RenderData();
        this.renderData.init(this);
        this.initData();
    }

    //override
    updateRenderData (comp) {
        if (comp._vertsDirty) {
            this.updateUVs(comp);
            this.fillLocalJoints(this.lJoints, this.rJoints);
            console.assert(this.lJoints.length >= this.joints);
            console.assert(this.rJoints.length >= this.joints);
            this.updateWorldVerts(comp);
            comp._vertsDirty = false;
        }
    }

    //override
    fillBuffers (comp, renderer) {
        if (renderer.worldMatDirty) {
            this.updateWorldVerts(comp);
        }

        let renderData = this.renderData;
        let vData = renderData.vDatas[0];
        let iData = renderData.iDatas[0];

        let buffer = this.getBuffer();
        let offsetInfo = buffer.request(this.verticesCount, this.indicesCount);

        // buffer data may be realloc, need get reference after request.

        // fill vertices
        let vertexOffset = offsetInfo.byteOffset >> 2;
        let vbuf = buffer._vData;

        if (vData.length + vertexOffset > vbuf.length) {
            vbuf.set(vData.subarray(0, this.verticesFloats), vertexOffset);
        }
        else {
            vbuf.set(vData, vertexOffset);
        }

        // fill indices
        let ibuf = buffer._iData;
        let indiceOffset = offsetInfo.indiceOffset;
        let vertexId = offsetInfo.vertexOffset;
        for (let i = 0, l = iData.length; i < l; i++) {
            ibuf[indiceOffset++] = vertexId + iData[i];
        }
    }

    private updateUVs (comp) {
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this.renderData.vDatas[0];
        this.fillVRange(this.vFromTo);
        for(let ji = 0; ji < this.joints; ++ji){
            let v = cc.misc.lerp(this.vFromTo.x, this.vFromTo.y, ji / (this.joints - 1));
            for (let i = 0; i < 3; i++) {
                let dstOffset = floatsPerVert * (i + ji * 3) + uvOffset;
                verts[dstOffset] = i / 2;
                verts[dstOffset + 1] = v;
            }
        }
    }

    private initData () {
        let data = this.renderData;
        data.createData(0, this.verticesFloats, this.indicesCount);
        let iData = data.iDatas[0];
        for(let ji = 0; ji < this.joints - 1; ++ji){
            let vertextID = ji * 3;
            let idx = ji * 12;
            iData[idx++] = vertextID;
            iData[idx++] = vertextID+1;
            iData[idx++] = vertextID+3;
            iData[idx++] = vertextID+1;
            iData[idx++] = vertextID+4;
            iData[idx++] = vertextID+3;

            vertextID++;
            iData[idx++] = vertextID;
            iData[idx++] = vertextID+1;
            iData[idx++] = vertextID+3;
            iData[idx++] = vertextID+1;
            iData[idx++] = vertextID+4;
            iData[idx++] = vertextID+2;
        }
    }

    private updateColor (comp, color) {
        let uintVerts = this.renderData.uintVDatas[0];
        if (!uintVerts) return;
        color = color ||comp.node.color._val;
        let floatsPerVert = this.floatsPerVert;
        let colorOffset = this.colorOffset;
        for (let i = colorOffset, l = uintVerts.length; i < l; i += floatsPerVert) {
            uintVerts[i] = color;
        }
    }

    private getBuffer () {
        return cc.renderer._handle._meshBuffer;
    }

    private updateWorldVerts (comp) {
        let verts = this.renderData.vDatas[0];
        let matrix = comp.node._worldMatrix;
        let matrixm = matrix.m;
        let a = matrixm[0];
        let b = matrixm[1];
        let c = matrixm[4];
        let d = matrixm[5];
        let tx = matrixm[12];
        let ty = matrixm[13];
        
        for(let ji = 0; ji < this.joints; ++ji){
            let l = this.lJoints[ji];
            let r = this.rJoints[ji];
            let from = ji * 3 * this.floatsPerVert;

            // [x, y]  *   [a, b]    + [tx, ty]
            //             [c, d]
            // left
            verts[from + 0] = l.x * a + l.y * c + tx;
            verts[from + 1] = l.x * b + l.y * d + ty;
            // center
            let cx = (l.x + r.x) * 0.5;
            let cy = (l.y + r.y) * 0.5
            verts[from + 5] = cx * a + cy * c + tx;
            verts[from + 6] = cx * b + cy * d + ty;
            // right
            verts[from + 10] = r.x * a + r.y * c + tx;
            verts[from + 11] = r.x * b + r.y * d + ty;
        } 
    }

    fillLocalJoints(lJoints: cc.Vec2[], rJoints: cc.Vec2[]){
        cc.warn('must implement fillLocalJoints');
    }

    fillVRange(vFromTo: cc.Vec2){
        cc.warn('must implement fillVRange');
    }
}


