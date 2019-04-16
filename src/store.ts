import { DeepPartial } from "./deep.partial";
import { merge } from "./merge";
import { ObservableFunc, Observer } from "./observer";
import { Subscriber } from "./subscriber";

/**
 * The store class. It holds information about app state, allows
 * to monitor store's app state change (through subscribers) and
 * allows central state change.
 */
export class Store<TAppState = {}> {
    constructor(state: TAppState) {
        this.stateInternal = state;
    }

    private stateInternal: TAppState;
    private subscribers: Array<Subscriber<TAppState>> = [];
    private observers: Map<Observer<TAppState>, Subscriber | undefined> = new Map();

    /**
     * The global store state. It is represented in its original form
     * (state is not altered to readonly, use immutable type for TAppState)
     */
    get state(): TAppState {
        return this.stateInternal as TAppState;
    }

    /**
     * Creates subscriber that can be used to monitor store's state change
     */
    public createSubscriber() {
        const subscriber = new Subscriber<TAppState>(
            () => this.stateInternal,
            (s, m) => this.registerObserver(m, s),
            s => this.update(s));

        this.subscribers.push(subscriber);
        return subscriber;
    }

    /**
     * Removes the subscriber from the store. If given subscriber is not
     * found, an exception will be thrown.
     */
    public removeSubscriber(subscriber: Subscriber) {
        const item = this.subscribers.find(c => c === subscriber);

        if (item) {
            const index = this.subscribers.indexOf(item);
            this.subscribers.splice(index, 1);
            const observer = Array.from(this.observers.entries()).find(p => p[1] === item);

            if (observer) {
                observer[0].signalDestuctors();
                this.unregisterObserver(observer[0]);
            }
        } else {
            throw new Error("Couldn't find given subscriber in a store list. Unknown subscriber to remove.");
        }
    }

    /**
     * Registers Observer object.
     * @param observer
     * @param associatedSubscriber
     * If associatedSubscriber is defined, then when Subscriber is removed,
     * observer will be removed too. This way we can pair observer to subscriber
     * so we don't have manually to clean observer too when creating trough
     * subscriber
     */
    public registerObserver(observer: Observer<TAppState>, associatedSubscriber?: Subscriber | undefined) {
        observer.initializeObserver(this.state, s => this.update(s));
        this.observers.set(observer, associatedSubscriber);

        // Run only mutable intializers, arr other type (void and Promise)
        // are ignored, they'll be called later, after mutable observers are done
        const mutableInitializers = observer.getMutableIncnitializerFunc();
        const newState = this.resolveFetchFunctions(mutableInitializers, this.state, this.state);
        const oldState = this.state;

        if (newState !== undefined) {
            this.update(newState);
        }

        // After mutable initializers are called and state is changed,
        // we call Async (Promise) and NonMutable (void) intializers
        observer
            .getInitializerFunc().concat(observer.getAsyncInitializerFunc())
            .forEach(func => func(this.state, oldState));
    }

    /**
     * Removes the observer from the store's list
     */
    public unregisterObserver(observer: Observer<TAppState>) {
        this.observers.delete(observer);
    }

    /**
     * The central update method. This method will trigger a change event
     * on all subscribers and run through all observers and raise, if needed,
     * the registered functions.
     */
    public update(newAppState: DeepPartial<TAppState>) {
        const oldAppState = this.stateInternal;
        const tempState = merge(oldAppState, newAppState);
        const alteredState = this.runMutableObservers(tempState, oldAppState);
        const finalAppState  = alteredState !== undefined ? merge(tempState, alteredState) : tempState;

        this.stateInternal = finalAppState;
        this.runObservers(finalAppState, oldAppState);
        this.triggerStateChanged();
    }

    private triggerStateChanged() {
        this.subscribers.forEach(p => p.signalStateChanged(this.stateInternal));
    }

    private resolveFetchFunctions(
        funcs: Array<ObservableFunc<TAppState>>,
        state: TAppState, oldState: TAppState): DeepPartial<TAppState> | undefined {

        const tasks = funcs.map(p => p(state, oldState));
        const states =  tasks
            .filter(p => !(p instanceof Promise))
            .filter(p => p !== undefined)
            .map(p => p as DeepPartial<TAppState>);

        const newState =  states.length > 0 ?
            states.reduce((p, c) => merge(p, c), {}) : undefined;

        return newState;
    }

    private runObservers(state: TAppState, oldState: TAppState) {
        const asyncObservers = Array
            .from(this.observers.keys())
            .map(p => p.getAsyncObservableFuncs(state, oldState))
            .reduce((p, c) => p.concat(c), []);

        asyncObservers.forEach(p => p(state, oldState));

        const observers = Array
            .from(this.observers.keys())
            .map(p => p.getObservableFuncs(state, oldState))
            .reduce((p, c) => p.concat(c), []);

        observers.forEach(p => p(state, oldState));
    }

    private runMutableObservers(state: TAppState, oldState: TAppState): DeepPartial<TAppState> | undefined {
        const observers = Array
            .from(this.observers.keys())
            .map(p => p.getMutableObservableFuncs(state, oldState, false))
            .reduce((p, c) => p.concat(c), []);

        return this.resolveFetchFunctions(observers, state, oldState);
    }
}
