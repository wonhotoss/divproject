export function getCurrentTime() {
    return (new Date()).getTime();
}

export function unlerp(from, to, t) {
    return (t - from) / (to - from);
}

export function numberWithCommas(x: number) {
    if (x == undefined) {
        return "0";
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// define globals
window['LTRB'] = {
    L: 0,
    T: 1,
    R: 2,
    B: 3,
    0: 'L',
    1: 'T',
    2: 'R',
    3: 'B',
    opposite(ltrb: LTRB){
        return ltrb == LTRB.L ? LTRB.R :
            ltrb == LTRB.T ? LTRB.B :
            ltrb == LTRB.R ? LTRB.L :
            ltrb == LTRB.B ? LTRB.T : undefined;
    },
};

window['getVisibleWorld'] = function(): cc.Rect{
    const designed = cc.view.getDesignResolutionSize();
    const designedAR = designed.width / designed.height;

    let visible = designed.clone();
    let canvasSize = cc.view.getCanvasSize();
    let AR = canvasSize.width / canvasSize.height;
    if(AR > designedAR){
        visible.width = visible.height * AR;
    }
    else if(AR < designedAR){
        visible.height = visible.width / AR;
    }
    return new cc.Rect(
        (designed.width - visible.width) / 2,
        (designed.height - visible.height) / 2,
        visible.width,
        visible.height
    );
}
