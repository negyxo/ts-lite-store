ts-lite-store Readme
====================================================================

**About**
This is flux based implementation in TypeScript for the React projects. The main goal was to leverage the power of TypeScript and use its type system as much as possible. This is simple library, with simple features, it is smilar to Redux, but it is oriented more to TypeScript than to vanila Javascript users.

**Installing**
You can find it on npm. To install type: `npm ts-lite-store -i`

**Introduction**
The ts-lite-store is following the Flux architecture with its unidirectional data flow. The store can be updated only in one place, by calling function `update`. The Store class cannot be used to listen for state changes, instead, Subscriber class must be used, which has simple event handler implementation that can be used to listen for the store's state changes. But, using the Subscriber's `stateChanged` event can be cumbersome, so in order to listen for the store state change events there is an Observer class that can be used for fine grained change detection.

**API**

*Creating store:*

```TypeScript
interface AppState {
    employees: Employee[];
    mainSreen: {
        employee: Employee;
        userInfo: string;
        email: string;
    },
    editSreen: {
        employee: Employee;
    }
}

StoreManager.createStore<AppState>(initialAppState);
```

This call will register global store witin the global scope and to get store from the global sope:

```TypeScript
const store = StoreManager.getStore<TAppState>();
```

*Adding Subscribers*

To add subscriber to the store and listen for the change event:

```TypeScript
const store = StoreManager.getStore<AppState>();
const subscriber = store.createSubscriber();
subscriber.stateChanged.on((data) => {
    console.log("State changed");
});
```

To remove subscriber:

```TypeScript
store.removeSubscriber(subscriber);
```

If subscriber has associated observer, it will be removed with it when subscriber is removed from the store.

*Adding Observers*

To add observer and listen to specific state change:

```TypeScript
class MyObserver extends Observer<AppState> {
    constructor() {
        super();

        this.registerObserver(
            p => this.employeeNameChanged(p),
            p => p.editSreen.employee.name)
    }

    public employeeNameChanged(state: AppState) {
        // do something when name is changed on main screen
    }
}

const observer = new MyObserver();
store.registerObserver(observer)
```

There are several methods that can be used to register a function. Each type will do its part a slightly different. These function are:

`registerMutableObserver`
As name suggests, this is mutable observer that can alter the state by returning the part of the state (DeepPartil<TState>) as a return value.

`registerAsyncObserver`
Registers an async observer (Promise<void>) for particular state part and triggers it when it is changed. As name suggests, this is mutable observer that can alter the state by returning the part of the state as a return value.

`registerObserver`
Registers regular observer that is only triggered but there is no special handling.

`registerMutableInitializer`
Similar to `registerMutableObserver` but this function doesn't observer nothing, it is only call once, when Observer is created.

`registerAsyncInitializer`
Similar to `registerAsyncObserver` but this function doesn't observer nothing, it is only call once, when Observer is created.

`registerInitializer`
Similar to `registerObserver` but this function doesn't observer nothing, it is only call once, when Observer is created.

`registerDestructor`
Registers function that will be called when Observer is removed from the store.


*Connected mixin*

The previous objects can be used as a standalone objects but their power comes when combining with Connected mixing (or ConnectedWithObserver). The Connected mixin returng React HOC that wraps the given component with the store/subscriber/and or observer.

and the code:

```TypeScript
const MyComponentConnected = ConnectedWithObserver(
    MyComponentBase,
    MyObserver,
    (state: AppState, observer: Observer) => ({
        employees: state.data
        currentEmployee: state.mainScreen.employee
    }));
```

In case when ConnectedWithObserver is called, observer will be created automatically and it will be associated with the component. So, when component is removed (componentWillUnmount) from the React tree, it will be also automatically removed from the store's observer collection, so given observer will onyl live during component lifetime which can optimize significantly performance as only few observers will be alive (for instance if there are hundreds observers, each observing its part of the state in some large application).


**Example**

Code examples comming soon.















