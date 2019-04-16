import * as React from 'react';
import { Store } from './store';
import { StoreManager } from './store.manager';
import { Subscriber } from './subscriber';
import { Observer } from './observer';

// This type is used to calculate difference between Map function 
// given properties and the Props of given component
type Omit<T, U> = Pick<T, Exclude<keyof T, keyof U>>;

export function Connected<
    TAppState,
    TProps,
    TRes extends Partial<TProps>>(
        Comp: new(...args: any[]) =>  React.Component<TProps>,
        map: (store: Store<TAppState>) => TRes) {
            return ConnectedWithObserverInternal(Comp, undefined, map);
}

export function ConnectedWithObserver<
    TAppState,
    TProps,
    TRes extends Partial<TProps>,
    TObserver extends Observer>(
        Comp: new(...args: any[]) =>  React.Component<TProps>,
        Observer: (new(...args: any) => TObserver) | undefined,
        map: (store: Store<TAppState>, observer: TObserver) => TRes) {
            return ConnectedWithObserverInternal(Comp, Observer, (store: Store<TAppState>, observer: TObserver | undefined) => map(store, observer!));
}

/**
 * This is mixin function for creating React HOC that is used to
 * hook on global store.
 * @param Comp 
 * React component to wire with a store.
 * @param Observer 
 * An optional observer that can be used to pair with the component
 * @param map 
 * A map function, to map Props properties to central store's properties.
 * If observer is used, it is also passed to map function, so observer
 * public functions can be used to map Props action to it
 */
function ConnectedWithObserverInternal<
    TAppState,
    TProps,
    TRes extends Partial<TProps>,
    TObserver extends Observer>(
        Comp: new(...args: any[]) =>  React.Component<TProps>,
        Observer: (new(...args: any) => TObserver) | undefined,
        map: (store: Store<TAppState>, middleware: TObserver | undefined) => TRes) {
    
            return class Connected extends React.Component<Omit<TProps, TRes>, TRes> {

                constructor(...args: any[]) {
                    super(args[0])
                    this.map = map;
                    this.store = StoreManager.getStore<TAppState>();
                    this.subscriber = this.store.createSubscriber();
                    this.subscriber.stateChanged.on(s => this.stateChanged(s))

                    if (Observer) {
                        this.observer = new Observer(args[0]);
                        this.subscriber.registerObserver(this.observer);
                    }

                    this.state = this.map(this.store, this.observer);
                }
                
                
                observer: TObserver | undefined;
                store : Store<TAppState>;
                subscriber: Subscriber<TAppState>;
                
                // this flag indicates whether the state can be updated via
                // setState or state direct set. We need to address this because
                // setState cannot be called before component is mounted but
                // our Observer can trigger an async function that can call
                // the update state before the component mount is completed
                // and in this case react will throw an error and we will 
                // have a missed state change
                /** @internal */
                canSetState = false;

                /** @internal */
                map: (store: Store<TAppState>, observer: TObserver | undefined) => TRes;

                componentWillMount() {
                    this.canSetState = true;
                }

                componentWillUnmount() {
                    this.store.removeSubscriber(this.subscriber);
                }
                
                render() {
                    const args : any = { ...this.props, ...this.state};
                    return <Comp {...args} />
                }

                stateChanged(state: TAppState) {
                    const newState = this.map(this.store, this.observer);

                    if (!this.areEqualShallow(newState, this.state))
                    {
                        if (this.canSetState)
                            this.setState(newState);
                        else
                            this.state = newState;
                    }
                }

                areEqualShallow(a: any, b: any) {
                    if (a === undefined && b === undefined) {
                        return true;
                    }

                    if (a === undefined || b === undefined) {
                        return false;
                    }

                    for(var key in a) {
                        if(a[key] !== b[key]) {
                            return false;
                        }
                    }
                    return true;
                }
            }
}