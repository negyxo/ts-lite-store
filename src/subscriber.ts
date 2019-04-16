import { DeepPartial } from "./deep.partial";
import { LiteEvent } from "./lite.event";
import { Observer } from "./observer";

/**
 * Defines subscription to the store. This allows us to listen for state change
 * events and add Observer class that will be automatically removed when this
 * (Subscriber is removed).
 */
export class Subscriber<TAppState = any> {
    constructor(
        /** @internal */
        public readonly getState: () => TAppState,
        /** @internal */
        public readonly registerMidlewareRequest: (sender: Subscriber, midleware: Observer<TAppState>) => void,
        /** @internal */
        public readonly requestUpdate: (newAppState: DeepPartial<TAppState>) => void) {
            this.stateChanged = new LiteEvent();
    }

    /**
     *  Signals that global (store's) TAppState is changed
     */
    public stateChanged: LiteEvent<TAppState>;

    /**
     * Registers Observer object to the store. Note: When Observer is registered
     * through Subsrciber (this method) then it will be also automatically
     * removed when Subscriber is removed from the store.
     * @param observer
     */
    public registerObserver(observer: Observer<TAppState>) {
        this.registerMidlewareRequest(this, observer);
        return this;
    }

    /** @internal */
    public signalStateChanged(newState: TAppState) {
        this.stateChanged.trigger(newState);
    }
}
