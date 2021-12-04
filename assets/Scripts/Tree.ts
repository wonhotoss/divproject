const { ccclass, property } = cc._decorator;
// import Grid from './Grid';
// import Flipbook from './Flipbook';
// import AudioSprites from './AudioSprite';

class userData<T>{
    constructor(public __data__: T) { }
}

class ensureComponent<T extends typeof cc.Component>{
    constructor(public __class__: T) { }
}

class screenAnchor {
    ltrbs: LTRB[];
    node: cc.Node;
    designedWP: cc.Vec3;
    designedWS = new cc.Size(1280, 720);

    // TODO: constructor(h: LTRB.L | LTRB.R, v: LTRB.T | LTRB.B)
    constructor(...ltrb: LTRB[]) {
        this.ltrbs = ltrb;
    }

    init(node: cc.Node) {
        this.node = node;
        this.designedWP = this.node.convertToWorldSpaceAR(cc.Vec3.ZERO);
    }

    update() {
        let world = getVisibleWorld();
        let WP = this.designedWP.clone();
        if (this.ltrbs.includes(LTRB.L) || this.ltrbs.includes(LTRB.R)) {
            if (this.ltrbs.includes(LTRB.L)) {
                let offset = this.designedWP.x;
                WP.x = world.x + offset;
            }
            else {
                let offset = this.designedWS.width - this.designedWP.x;
                WP.x = world.x + world.width - offset;
            }
        }

        if (this.ltrbs.includes(LTRB.T) || this.ltrbs.includes(LTRB.B)) {
            if (this.ltrbs.includes(LTRB.T)) {
                let offset = this.designedWS.height - this.designedWP.y;
                WP.y = world.y + world.height - offset;
            }
            else {
                let offset = this.designedWP.y;
                WP.y = world.y + offset;
            }
        }

        this.node.position = this.node.parent.convertToNodeSpaceAR(WP);
    }
}

class screenBG {
    node: cc.Node;
    designedSize: cc.Size;

    init(node: cc.Node) {
        this.node = node;
        this.designedSize = node.getContentSize();

        // loading scene including canvas touch contentSize of this.
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            if (cc.isValid(this.node)) {
                this.update();
            }
        });

        // TODO: unregister callback when node destroyed
        // TODO: register resize callback
    }

    update() {
        let world = getVisibleWorld();
        let size = this.designedSize.clone();

        const designedAR = this.designedSize.width / this.designedSize.height;
        const AR = world.width / world.height;

        if (designedAR > AR) {
            // fit height
            size.height = world.height;
            size.width = world.height * designedAR;
        }
        else {
            // fit width
            size.width = world.width;
            size.height = world.width / designedAR;
        }

        this.node.setContentSize(size);
    }
}

class screenWidget {
    node: cc.Node;
    designedInsets: {[ltrb in LTRB]: number};
    ltrbs: LTRB[];

    constructor(...ltrb: LTRB[]) {
        this.ltrbs = ltrb;
        
    }

    init(node: cc.Node) {
        this.node = node;
        const designed = cc.view.getDesignResolutionSize();
        designed.width /= 2;
        designed.height /= 2;
        const nodeSize = node.getContentSize();
        nodeSize.width /= 2;
        nodeSize.height /= 2;
        this.designedInsets = {
            [LTRB.L]: designed.width + node.x - nodeSize.width,
            [LTRB.T]: designed.height - node.y - nodeSize.height,
            [LTRB.R]: designed.width - node.x - nodeSize.width,
            [LTRB.B]: designed.height + node.y - nodeSize.height,
        };

        // loading scene including canvas touch contentSize of this.
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            if (cc.isValid(this.node)) {
                this.update();
            }
        });

        // TODO: unregister callback when node destroyed
        // TODO: register resize callback
    }

    update() {
        const world = getVisibleWorld();
        world.width /= 2;
        world.height /= 2;
        const nodeSize = this.node.getContentSize();
        nodeSize.width /= 2;
        nodeSize.height /= 2;
        const insets = {
            [LTRB.L]: this.ltrbs.includes(LTRB.L) ? this.designedInsets[LTRB.L] : world.width + this.node.x - nodeSize.width,
            [LTRB.T]: this.ltrbs.includes(LTRB.T) ? this.designedInsets[LTRB.T] : world.height - this.node.y - nodeSize.height,
            [LTRB.R]: this.ltrbs.includes(LTRB.R) ? this.designedInsets[LTRB.R] : world.width - this.node.x - nodeSize.width,
            [LTRB.B]: this.ltrbs.includes(LTRB.B) ? this.designedInsets[LTRB.B] : world.height + this.node.y - nodeSize.height,
        };

        const borders = {
            [LTRB.L]: -world.width + insets[LTRB.L],
            [LTRB.T]: world.height - insets[LTRB.T],
            [LTRB.R]: world.width - insets[LTRB.R],
            [LTRB.B]: -world.height + insets[LTRB.B],
        };

        this.node.setPosition(
            (borders[LTRB.L] + borders[LTRB.R]) / 2,
            (borders[LTRB.T] + borders[LTRB.B]) / 2,
        );

        this.node.setContentSize(
            borders[LTRB.R] - borders[LTRB.L],
            borders[LTRB.T] - borders[LTRB.B],
        );
    }
}

class gauge {
    sprite: cc.Sprite;
    position0: cc.Vec3;
    position1: cc.Vec3;
    size0: cc.Size;
    size1: cc.Size;
    amount01 = 1;

    constructor(private from: LTRB) {
    }

    init(sprite: cc.Sprite) {
        this.sprite = sprite;

        // assumt that gauge fulled when init
        // assume that node.x == node.y == 0;
        let node = this.sprite.node;
        this.position0 = node.position.clone();
        this.position1 = node.position.clone();
        this.size0 = node.getContentSize().clone();
        this.size1 = node.getContentSize().clone();

        let frame = this.sprite.spriteFrame;

        switch (this.from) {
            case LTRB.R:
            case LTRB.L: {
                this.size0.width = frame.insetLeft + frame.insetRight;
                this.position0.x = this.from == LTRB.L
                    ? -this.size1.width / 2 + frame.insetLeft
                    : this.size1.width / 2 - frame.insetRight;
            } break;
            case LTRB.B:
            case LTRB.T: {
                this.size0.height = frame.insetTop + frame.insetBottom;
                this.position0.y = this.from == LTRB.T
                    ? this.size1.height / 2 - frame.insetTop
                    : -this.size1.height / 2 + frame.insetBottom;
            } break;
        }
    }

    fill(amount01: number) {
        amount01 = cc.misc.clamp01(amount01);
        let node = this.sprite.node;
        node.position = this.position0.lerp(this.position1, amount01);
        node.setContentSize(
            cc.misc.lerp(this.size0.width, this.size1.width, amount01),
            cc.misc.lerp(this.size0.height, this.size1.height, amount01),
        );
        this.amount01 = amount01;
    }
}

type userDataNames<T> = { [K in keyof T]: T[K] extends userData<infer U> ? K : never }[keyof T];
type nonUserDataNames<T> = { [K in keyof T]: T[K] extends userData<infer U> ? never : K }[keyof T];

type treeBranch<T> = {
    readonly [P in nonUserDataNames<T>]: treeNode<T[P]>;
} & {
        [P in userDataNames<T>]: treeNode<T[P]>;
    } & {
    readonly node: cc.Node;
}

type treeNode<T> =
    T extends typeof cc.Component ? InstanceType<T> :
    T extends userData<infer U> ? U :
    T extends ensureComponent<infer U> ? InstanceType<U> :
    T extends screenAnchor ? screenAnchor :
    T extends screenBG ? screenBG :
    T extends screenWidget ? screenWidget :
    T extends gauge ? gauge :
    treeBranch<T>;

type treeRoot<T> = treeNode<T> & {
    signature: T,
    mount: (root: cc.Node) => void,
};

type indexed = {
    [key: string]: any;
}

export default class Tree {
    static readonly Node = new cc.Node();
    static readonly Sprite = new cc.Sprite();
    static readonly Label = new cc.Label();
    static readonly LabelOutline = new cc.LabelOutline();
    // static readonly Grid = new Grid();
    // static readonly Flipbook = new Flipbook();
    static readonly RichText = new cc.RichText();

    private static ensureComponent<T extends cc.Component>(node: cc.Node, type: { prototype: T, new(): T }): T {
        return node.getComponent(type) || node.addComponent(type);
    }

    private static _mount(root: cc.Node, tree, path: string) {
        for (let key of Object.keys(tree)) {
            let value = tree[key];
            switch (value) {
                case this.Node: {
                    tree[key] = root;
                } break;
                case this.Sprite: {
                    tree[key] = this.ensureComponent(root, cc.Sprite);
                } break;
                case this.Label: {
                    tree[key] = this.ensureComponent(root, cc.Label);
                } break;
                case this.LabelOutline: {
                    tree[key] = this.ensureComponent(root, cc.LabelOutline);
                } break;
                // case this.Grid: {
                //     tree[key] = this.ensureComponent(root, Grid);
                // } break;
                // case this.Flipbook: {
                //     tree[key] = this.ensureComponent(root, Flipbook);
                // } break;
                case this.RichText: {
                    tree[key] = this.ensureComponent(root, cc.RichText);
                } break;
                default: {
                    let fullPath = `${path}.${key}`;
                    let child = root.getChildByName(key);
                    if (child) {
                        this._mount(child, value, fullPath);
                    } else {
                        console.error(`cannot find node [${key}], path = ${fullPath}`);
                    }
                } break;
            }
        }
    }

    // TODO: reuse bind
    static mount(root: cc.Node, tree) {
        this._mount(root, tree, root.name);
    }

    static makeButton(node: cc.Node, onClick?: (e) => void, options = {}) {
        let btn = this.ensureComponent(node, SimpleButton);
        if (onClick) {
            btn.onClick = (e) => { onClick(e); return Promise.resolve(); }
        }
        else{
            btn.onClick = null;
        }
        btn.options = Object.assign({ sound: true }, options);
    }

    static makeTransactionButton(node: cc.Node, onClick?: (e) => Promise<any>, options = {}) {
        let btn = this.ensureComponent(node, SimpleButton);
        btn.onClick = onClick;
        btn.options = Object.assign({ sound: true }, options);
    }

    static setButtonEnabled(node: cc.Node, enabled: boolean) {
        let button = node.getComponent(SimpleButton);
        if (!button)
            return;
        button.enabled = enabled;
    }

    private static makeWrap(signature: any) {
        let wrap: indexed = {};

        for (let key of Object.keys(signature)) {
            let v = signature[key];
            if (cc.Component.prototype.isPrototypeOf(v.prototype)) {
                wrap[key] = null;
            }
            else if (v instanceof userData) {
                wrap[key] = v.__data__;
            }
            else if (v instanceof ensureComponent) {
                wrap[key] = null;
            }
            else if (v instanceof screenAnchor) {
                wrap[key] = v;
            }
            else if (v instanceof screenBG) {
                wrap[key] = v;
            }
            else if (v instanceof screenWidget) {
                wrap[key] = v;
            }
            else if (v instanceof gauge) {
                wrap[key] = v;
            }
            else {
                wrap[key] = this.makeWrap(v);
            }
        }
        wrap['__signature__'] = signature;
        return wrap;
    }

    private static fillWrap(node: cc.Node, wrap: any, signature: any) {
        for (let key of Object.keys(signature)) {
            let v = signature[key];
            if (cc.Component.prototype.isPrototypeOf(v.prototype)) {
                let component = node.getComponent(v);
                if (component) {
                    wrap[key] = component;
                }
                else {
                    console.error(`cannot find component ${v} from node ${node.name}`);
                }
            }
            else if (v instanceof userData) {
            }
            else if (v instanceof ensureComponent) {
                let component = this.ensureComponent(node, v.__class__);
                wrap[key] = component;
            }
            else if (v instanceof screenAnchor) {
                v.init(node);
                v.update();
            }
            else if (v instanceof screenBG) {
                v.init(node);
                v.update();
            }
            else if (v instanceof screenWidget) {
                v.init(node);
                v.update();
            }
            else if (v instanceof gauge) {
                v.init(node.getComponent(cc.Sprite));
            }
            else {
                let child = node.getChildByName(key);
                if (child) {
                    this.fillWrap(child, wrap[key], v);
                }
                else {
                    console.error(`cannot find child node "${key}" from node ${node.name}`);
                }
            }
        }
        wrap.node = node;
    }

    static make<T extends indexed>(signature: T): treeRoot<T> {
        let result: indexed = this.makeWrap(signature);
        result.signature = signature;
        result.mount = (node: cc.Node) => {
            this.fillWrap(node, result, signature);
        }
        return result as treeRoot<T>;
    }

    static clone<T extends indexed>(branch: treeBranch<T>): treeRoot<T>{
        let node = cc.instantiate(branch.node);
        let bind = this.make(branch['__signature__'] as T);
        bind.mount(node);
        return bind;
    }

    static userData<T>(data: T): userData<T> {
        return new userData(data);
    };

    static ensure<T extends typeof cc.Component>(type: T): ensureComponent<T> {
        return new ensureComponent(type);
    }

    static screenAnchor(...ltrb: LTRB[]): screenAnchor {
        return new screenAnchor(...ltrb);
    }

    static screenBG(): screenBG {
        return new screenBG();
    }

    static screenWidget(...ltrb: LTRB[]): screenWidget {
        return new screenWidget(...ltrb);
    }

    static gauge(from: LTRB): gauge {
        return new gauge(from);
    }

    static waitClick(...buttons: cc.Node[]): Promise<cc.Node> {
        return new Promise(resolve => {
            buttons.forEach(btn => this.makeButton(btn, () => {
                // unsubscribe all
                buttons.forEach(_btn => this.makeButton(_btn));
                resolve(btn);
            }));
        });
    }
    
}

@ccclass
class SimpleButton extends cc.Component {
    @property
    onClick: (e: any) => Promise<any> = null;

    @property
    options: {
        sound?: boolean,
        pushedScale?: number,
        pushedImage?: cc.Node,
    } = {};
    start() {
        let down = false;
        let oldScale = 1;        
        let togglePushedImage = (toggled:boolean) => {
            if (this.options.pushedImage) {
                this.options.pushedImage.active = toggled;
            }
        };        

        this.node.on(cc.Node.EventType.TOUCH_START, () => {
            if (this.onClick && this.enabled) {
                oldScale = this.node.scale;
                let width = this.node.width * oldScale;
                let pushedScale = (typeof this.options.pushedScale == 'number') ? this.options.pushedScale : (width + 10) / width;
                this.node.scale = pushedScale;
                togglePushedImage(true);                
                down = true;
            }
        });

        this.node.on(cc.Node.EventType.TOUCH_CANCEL, () => {
            this.node.scale = oldScale;
            togglePushedImage(false);                
            down = false;
        });

        this.node.on(cc.Node.EventType.TOUCH_END, (e) => {
            this.node.scale = oldScale;
            togglePushedImage(false);                
            if (down) {
                down = false;
                this.node.scale = oldScale;            
                if (this.onClick && this.enabled) {
                    if (this.options.sound) {
                        // AudioSprites.playEffect('common', 'button_click');
                    }
                    (async () => {
                        this.enabled = false;
                        await this.onClick(e).catch(r => {Promise.reject(r)});  // must rethrow and resolve
                        if (cc.isValid(this)) {
                            this.enabled = true;
                        }
                    })();
                }
            }
        });
    }
}

export type T = Tree;
