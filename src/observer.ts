import { DeepPartial } from "./deep.partial";

export type ObservableFunc<TAppState> =  (state:TAppState, oldState?: TAppState) => DeepPartial<TAppState> | Promise<void> | void;

interface ObservableMethod<TAppState> {
    func: ObservableFunc<TAppState>
    args: ((appState: TAppState) => any)[];
}

/**
 * Observer class used to listen for changes for some store's part.
 */
export class Observer<TAppState = any> {

    constructor() {
        this.registerObserver(
            s => this.setState(s),
            c => c
        );
    }

    // We need to separate each type of observable functions to its
    // separate list. This is because we cannot inspect in a runtime
    // what is the return type of the function, unless we execute 
    // the function and wait for its return value
    private mutableObservers: ObservableMethod<TAppState>[] = [];
    private asyncObservers: ObservableMethod<TAppState>[] = [];
    private observers: ObservableMethod<TAppState>[] = [];

    private mutableInitializers: ObservableFunc<TAppState>[] = [];
    private asyncInitializers: ObservableFunc<TAppState>[] = [];
    private initializers: ObservableFunc<TAppState>[] = [];

    private destuctors: (() => void)[] = [];
    private updateRequest!:((state: DeepPartial<TAppState>) => void);
    private stateInternal!: TAppState;

    /**
     * Calls update on a global App State.
     */
    protected update(state: DeepPartial<TAppState>) {
        this.updateRequest!(state);
    }

    protected registerMutableObserver(
        func: (state:TAppState, oldState?: TAppState) => DeepPartial<TAppState>,
        ...args: ((appState: TAppState) => any)[]) {
            this.mutableObservers.push({
                func,
                args
            });
    }

    protected registerAsyncObserver(
        func: (state:TAppState, oldState?: TAppState) => Promise<void>,
        ...args: ((appState: TAppState) => any)[]) {
            this.asyncObservers.push({
                func,
                args
            });
    }

    protected registerObserver(
        func: (state:TAppState, oldState?: TAppState) => void,
        ...args: ((appState: TAppState) => any)[]) {
            this.observers.push({
                func,
                args
            });
    }

    protected registerMutableInitializer(func: (state:TAppState, oldState?: TAppState) => DeepPartial<TAppState>) {
        this.mutableInitializers.push(func);
    }

    protected registerAsyncInitializer(func: (state:TAppState, oldState?: TAppState) => Promise<void>) {
        this.asyncInitializers.push(func);
    }

    protected registerInitializer(func: ObservableFunc<TAppState>) {
        this.initializers.push(func);
    }

    protected registerDestructor(func: () => void)  {
        this.destuctors.push(func);
    }

    private setState(state: TAppState ) {
        this.stateInternal = state;
        return undefined;
    }

    get state() {
        return this.stateInternal!;
    }

    /** @internal */
    initializeObserver(state: TAppState, updateRequest: (state: DeepPartial<TAppState>) => void) {
        this.stateInternal = state;
        this.updateRequest = updateRequest;
    } 

    /** @internal */
    getInitializerFunc() : ObservableFunc<TAppState>[] {
        return this.initializers;
    }

    /** @internal */
    getAsyncInitializerFunc() : ObservableFunc<TAppState>[] {
        return this.asyncInitializers;
    }

    /** @internal */
    getMutableIncnitializerFunc() : ObservableFunc<TAppState>[] {
        return this.mutableInitializers;
    }

    /** @internal */
    getAsyncObservableFuncs(state: TAppState, oldState: TAppState) : ObservableFunc<TAppState>[] {
        const funcs = this.asyncObservers
            .filter(p => p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    getMutableObservableFuncs(state: TAppState, oldState: TAppState, returnAll: boolean) : ObservableFunc<TAppState>[] {
        const funcs = this.mutableObservers
            .filter(p => returnAll || p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    getObservableFuncs(state: TAppState, oldState: TAppState) : ObservableFunc<TAppState>[] {
        const funcs = this.observers
            .filter(p => p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    signalDestuctors() {
        this.destuctors.forEach(p => p());
    }
}

