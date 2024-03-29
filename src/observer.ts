import { DeepPartial } from "./deep.partial";
import { merge } from "./merge";

export type ObservableFunc<TAppState> =
    (state: TAppState, oldState?: TAppState) => DeepPartial<TAppState> | Promise<void> | void;

interface IObservableMethod<TAppState> {
    func: ObservableFunc<TAppState>;
    args: Array<(appState: TAppState) => any>;
}

/**
 * Observer class used to listen for changes for some store's part.
 */
export class Observer<TAppState = any, TLocalState = any> {
    constructor() {
        this.key = this.constructor.name;
        this._localState = this.getInitalLocalState();
        this.registerObserver(
            s => this.setState(s),
            c => c,
        );
    }

    /**
     * 
     */
    key: string;
    
    // we need to separate each type of observable functions to its separate
    // list. This is because we cannot inspect in a runtime what is the return
    // type of the function, unless we execute the function and wait for its
    // return value
    private mutableObservers: Array<IObservableMethod<TAppState>> = [];
    private asyncObservers: Array<IObservableMethod<TAppState>> = [];
    private observers: Array<IObservableMethod<TAppState>> = [];

    private mutableInitializers: Array<ObservableFunc<TAppState>> = [];
    private asyncInitializers: Array<ObservableFunc<TAppState>> = [];
    private initializers: Array<ObservableFunc<TAppState>> = [];

    private destuctors: Array<() => void> = [];
    private updateRequest!: ((state: DeepPartial<TAppState>) => void);
    private localUpdateRequest!: (() => void);
    private stateInternal!: TAppState;

    private _localState: TLocalState;

    private _disposed = false;
    private initialState: ObservableFunc<TAppState> | undefined;

    /**
     * Calls update on a global App State.
     */
    protected update(state: DeepPartial<TAppState>) {
        this.updateRequest!(state);
    }

    protected registerMutableObserver(
        func: (state: TAppState, oldState?: TAppState) => DeepPartial<TAppState>,
        ...args: Array<(appState: TAppState) => any>) {
            this.mutableObservers.push({
                args,
                func,
            });
    }

    protected registerAsyncObserver(
        func: (state: TAppState, oldState?: TAppState) => Promise<void>,
        ...args: Array<(appState: TAppState) => any>) {
            this.asyncObservers.push({
                args,
                func,
            });
    }

    protected registerObserver(
        func: (state: TAppState, oldState?: TAppState) => void,
        ...args: Array<(appState: TAppState) => any>) {
            this.observers.push({
                args,
                func,
            });
    }

    protected registerMutableInitializer(func: (state: TAppState, oldState?: TAppState) => DeepPartial<TAppState>) {
        this.mutableInitializers.push(func);
    }

    protected registerAsyncInitializer(func: (state: TAppState, oldState?: TAppState) => Promise<void>) {
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
    }

    get state() {
        return this.stateInternal!;
    }

    get localState() {
        return this._localState;
    }

    public setInitialState(func: (currentState: TAppState) => DeepPartial<TAppState>) {
        this.initialState = func;
    }

    /** @internal */
    public initializeObserver(state: TAppState, updateRequest: (state: DeepPartial<TAppState>) => void, localUpdateRequest: () => void) {
        this.stateInternal = state;
        this.updateRequest = updateRequest;
        this.localUpdateRequest = localUpdateRequest;
    }

      /** @internal */
    public getInitialState(): ObservableFunc<TAppState> | undefined {
        return this.initialState;
    }

    /** @internal */
    public getInitializerFunc(): Array<ObservableFunc<TAppState>> {
        return this.initializers;
    }

    /** @internal */
    public getAsyncInitializerFunc(): Array<ObservableFunc<TAppState>> {
        return this.asyncInitializers;
    }

    /** @internal */
    public getMutableIncnitializerFunc(): Array<ObservableFunc<TAppState>> {
        return this.mutableInitializers;
    }

    /** @internal */
    public getAsyncObservableFuncs(state: TAppState, oldState: TAppState): Array<ObservableFunc<TAppState>> {
        if (this._disposed) return [];

        const funcs = this.asyncObservers
            .filter(p => p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    public getMutableObservableFuncs(state: TAppState, oldState: TAppState, returnAll: boolean)
    : Array<ObservableFunc<TAppState>> {
        if (this._disposed) return [];

        const funcs = this.mutableObservers
            .filter(p => returnAll || p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    public getObservableFuncs(state: TAppState, oldState: TAppState): Array<ObservableFunc<TAppState>> {
        if (this._disposed) return [];

        const funcs = this.observers
            .filter(p => p.args.some(e => e(oldState) !== e(state)))
            .map(p => p.func);

        return funcs;
    }

    /** @internal */
    public signalDestuctors() {
        this._disposed = true;
        this.destuctors.forEach(p => p());
    }

    protected updateLocalState(state: DeepPartial<TLocalState>) {
        const tempState = merge(this._localState, state);
        this._localState = tempState as TLocalState;
        this.localUpdateRequest();
    }

    protected getInitalLocalState(): TLocalState {
        return {} as TLocalState;
    }
}
