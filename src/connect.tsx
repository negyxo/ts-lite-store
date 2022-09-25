import * as React from "react";
import { Observer } from "./observer";
import { Store } from "./store";
import { Subscriber } from "./subscriber";
import { useStoreProvider } from "./store.provider";
import { useEffect } from "react";

// this type is used to calculate difference between Map function given
// properties and the Props of given component
export type OmitType<T, U> = Pick<T, Exclude<keyof T, keyof U>>;

/**
 * This is mixin function for creating React HOC that is used to hook on global
 * store.
 * @param Comp React component to wire with a store.
 * @param Observer An optional observer that can be used to pair with the
 * component
 * @param map A map function, to map Props properties to central store's
 * properties. If observer is used, it is also passed to map function, so
 * observer public functions can be used to map Props action to it
 */
export function connect<TAppState, TProps, TRes extends Partial<TProps>, TObserver extends Observer, TArgs extends unknown[]>(
    Comp: React.ComponentType<TProps>,
    Observer: (new(...args: [...TArgs]) => TObserver) | undefined,
    map: (store: Store<TAppState>, middleware: TObserver | undefined) => TRes,
    observerArgs: ((store: Store<TAppState>, props: OmitType<TProps, TRes>) => TArgs) | undefined,
    ) : React.FunctionComponent<OmitType<TProps, TRes>> {
        return (props: OmitType<TProps, TRes>) => {
            // Normally, we don't use ref to hold for a state, but in some
            // edge cases react doesn't return the last state after setState 
            // is called, which in some cases leads to miss in detection of
            // store change, and then underlayign component is never updated,
            // so in order to mitigate this issue, we store the state in hooks
            // and in this ref, basically we now have on two places the state
            // of the component, and this one is used only to check changes 
            // between last state and new incoming state (map function for store)
            const lastState = React.useRef<TRes | undefined>(undefined)
            const store = useStoreProvider();
            const observer = React.useRef<TObserver| undefined>(Observer
                ? store.getOrCreateObserver(
                    Observer.name ?? "", 
                    Observer, 
                    observerArgs ? observerArgs(store, props) : undefined)
                : undefined);
            const subscriber = React.useRef<Subscriber>();
            const [ state, setState ] = React.useState<TRes>(map(store, observer.current))

            const stateChanged = () => {
                const newState = map(store, observer.current);
                if (!areEqualShallow(newState, lastState)) {
                    lastState.current = state;
                    setState(newState)
                }
            }

            useEffect(() => {
                subscriber.current = store.createSubscriber();
                subscriber.current.stateChanged.on(() => stateChanged());

                if (observer.current) {
                    subscriber.current.registerObserver(observer.current);
                }

                return () => {
                    store.removeSubscriber(subscriber.current!);
                };
            }, [store]);

            const newProps = { ...props, ...state } as any;

            return <Comp {...newProps}/>
        }
}

function areEqualShallow(a: any, b: any) {
    if (a === undefined && b === undefined) {
        return true;
    }
    
    if (a === undefined || b === undefined) {
        return false;
    }

    for (const key in a) {
        if (isFunction(a[key])) {
            continue;
        }

        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}


function isFunction(obj: any) {
    return (typeof obj === "function");
}