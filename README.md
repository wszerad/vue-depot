# vue-depot
Simple state manager based and for Vue with support for vue-devtools.
### Installation
```
npm install vue-depot
```
### Usage

Creating state manager
```ts
//store.ts
import {Depot, Store, module} from 'vue-depot';
@Store(true)
class RootStore extends Depot {
    public lastUpdate: Date = new Date();
    public todos: string[] = [];
    get todosCount(): number {
        return this.todos.length;
    }
    public addTodo(text: string) {
        this.todos.push(text);
    }
    public async asyncAddTodo(test: string) {
        return Promise((r) => {
            setTimeout(() => {
                this.addTodo(test);
                r();
            }, 1000)
        });
    }
}
export const BaseStore = new RootStore();
```
Usage in other file
```vue
import {BaseStore} from './store.ts'
new Vue({
    data() {
        return {
            store: BaseStore
        };
    },
    computed: {
        todosList() {
            return this.store.todos.join();
            // or return BaseStore.todos.join();
        }
    },
    methods: {
        add() {
            this.store.addTodo('newTodo');
            // or BaseStore.addTodo('newTodo');
            // or @click="store.addTodo('newTodo')" inside template
        }
    }
})
```

#### @Store(isRootInstance?: boolean)
* isRootInstance - needed only for vue-devtools to recognise root instance and emit "init" event.

Convert given class to Vue component so new instance is in fact new Vue component
with full support of features like smart getters, reactive props and methods like $watch.
Decorator also inject state getter/setter required for vue-devtools
(extending with Depot is optional and only add typings for .state)

### Modules
It is possible to nesting instances in this way:
```ts
@Store()
class User { ...some props and actions }
@Store(true)
class RootStore extends Depot {
    @module(User)
    public user: User = new User();
    @module(User)
    public userList: User[] = [];
}
export const BaseStore = new RootStore();
```
IMPORTANT!!!
Remember to manipulate with Arrays like in Vue: use Vue.set(BaseStore.userList, 0, value) instead of BaseStore.userList[0] = value;

#### @module<T extends Depot>(moduleClass: T)
* moduleClass - necessary for casting raw object into module.
Define nested module

#### Depot
##### Depot.state
Setter/getter to get or set raw-data model. Mainly used by vue-devtools and may be expensive.
It support module instances casting so raw object will be converted to module object (but only for modules).