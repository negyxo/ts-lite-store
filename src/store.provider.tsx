import React = require("react");
import { Store } from "./store";

const StoreContext = React.createContext<Store<any>>(null!);

export const StoreProvider = (props: {children: any;  store: Store<any> }) => {
    return <StoreContext.Provider value={props.store}>
        {props.children }
    </StoreContext.Provider>
}

export const useStoreProvider = () => {
    const context = React.useContext(StoreContext);
    return context;
}