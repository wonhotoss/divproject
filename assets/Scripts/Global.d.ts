declare let getVisibleWorld: () => cc.Rect;

declare enum LTRB {
    L = 0,
    T = 1,
    R = 2,
    B = 3,
};

declare namespace LTRB{
    export let opposite: (ltrb: LTRB) => LTRB;
}
