import { DeepPartial } from "./deep.partial";
import { isDeepEqual } from "./deepEqual";
import { merge } from "./merge";
import { ObservableFunc, Observer } from "./observer";
import { Subscriber } from "./subscriber";

interface ObserverMap<TAppState> {
    observer: Observer<TAppState>;
    subscribers: Subscriber[]
};

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
    private observers: Map<string, ObserverMap<TAppState>> = new Map();

    public maximumStackCount = 1000;

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
            const map = Array
                .from(this.observers.entries())
                .find(p => p[1]!.subscribers.find(s => s === item) !== undefined);

            if (map === undefined || map[1].subscribers!.length === 0) {
                return;
            }
            else if (map[1].subscribers!.length === 1) {
                map[1].observer.signalDestuctors();
                this.unregisterObserver(map[1].observer);
            }
            else {
                this.observers.set(
                    map[0],
                    {
                        observer: map[1].observer,
                        subscribers: map[1].subscribers.filter(s => s !== item)
                    }
                )
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
        if (this.observers.has(observer.key)) {
            return;
        }

        observer.initializeObserver(this.state, s => this.update(s));
        this.observers.set(observer.key, 
            {
                observer,
                subscribers: associatedSubscriber ? [associatedSubscriber] : []
            });

        // This will set state to new state if setInitialState on observer is defined
        // this will not trigger observers, because this is intentend, we want an option
        // to have alwyas the same starting point when observer is initialized, that way
        // we won't have side effects when state is already changed by this observer in some
        // of the previous calls
        const initialState = observer.getInitialState();
        if (initialState !== undefined) {
            const tempState = initialState(this.stateInternal);
            const oldAppState = this.stateInternal;
            const newAppState = merge(oldAppState, tempState);
            this.stateInternal = newAppState;
        }

        // Run only mutable intializers, all other types (void and Promise)
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
        this.observers.delete(observer.key);
    }

    /**
     * The central update method. This method will trigger a change event
     * on all subscribers and run through all observers and raise, if needed,
     * the registered functions.
     */
    public update(newAppState: DeepPartial<TAppState>) {

        // If newly values are the same as the current ones
        // avoid triggering update, because nothing is changed
        if (isDeepEqual(newAppState, this.stateInternal))
            return;

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
        const states = tasks
            .filter(p => !(p instanceof Promise))
            .filter(p => p !== undefined)
            .map(p => p as DeepPartial<TAppState>);

        const newState =  states.length > 0 ?
            states.reduce((p, c) => merge(p, c), {}) : undefined;

        return newState;
    }

    private runObservers(state: TAppState, oldState: TAppState) {
        const allObservers = Array
            .from(this.observers.values())
            .map(p => p.observer);
        
        const asyncObservers = allObservers
            .map(p => p.getAsyncObservableFuncs(state, oldState))
            .reduce((p, c) => p.concat(c), []);

        asyncObservers.forEach(p => p(state, oldState));

        const observers = allObservers
            .map(p => p.getObservableFuncs(state, oldState))
            .reduce((p, c) => p.concat(c), []);

        observers.forEach(p => p(state, oldState));
    }

    private runMutableObservers(state: TAppState, oldState: TAppState): DeepPartial<TAppState> | undefined {
        let newState: TAppState | undefined;
        let tempState = state;
        let tempOldState = oldState;
        let counter = 0;

        // We need to go over observers as many times as needed, because each
        // observer can trigger change that can trigger another observer and
        // so on. This can lead to infinite recursion, but we try to prevent
        // this by counting how many times we are looping
        while (true) {
            const res = this.runMutableObserversInternal(tempState, tempOldState);
            if (res !== undefined) {
                newState = merge(tempState, res);
                tempOldState = tempState;
                tempState = newState!;
            } else {
                break;
            }

            // Prevent infinite recursion
            counter++;

            if (counter > this.maximumStackCount) {
                throw Error(`Max stack count ${this.maximumStackCount} exceeded. Possible infinite recursion.`);
            }
        }

        return newState;
    }

    private runMutableObserversInternal(state: TAppState, oldState: TAppState): DeepPartial<TAppState> | undefined {
        const observers = Array
            .from(this.observers.values())
            .map(p => p.observer)
            .map(p => p.getMutableObservableFuncs(state, oldState, false))
            .reduce((p, c) => p.concat(c), []);

        return this.resolveFetchFunctions(observers, state, oldState);
    }
}
