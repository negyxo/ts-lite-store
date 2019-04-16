import { Store } from "./store";

/**
 * Allows global store to be registred. This is only possible to do once per
 * application scope. It should be used at the beginging of the App.
 */
export  class StoreManager {
    private static globalStore: Store<any> | undefined;

    public static createStore<TAppState>(initialStore: TAppState) {
        if (!this.globalStore) {
            this.globalStore = new Store<TAppState>(initialStore);
        }
        return this.globalStore as Store<TAppState>;
    }

    public static getStore<TAppState>(): Store<TAppState> {
        return this.globalStore as Store<TAppState>;
    }
}
