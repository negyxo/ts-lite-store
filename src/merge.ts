/**
 * Determines whether the given value is an object but
 * not array or date.
 * @param target any type
 */

function isObject(target: any) {
    return (target && typeof target === 'object' && !(target instanceof Date)  && !Array.isArray(target));
}

export type Subset<A extends {}, B extends {}> = {
    [P in keyof B]: P extends keyof A ? (B[P] extends A[P] | undefined ? A[P] : never) : never;
}
 
/**
 * Deep merges two objects into the one. If the same properties are
 * present in both objects, then first one is overwriten with second.
 * 
 * @param first Reference to object.
 * @param second Reference to object.
 */
export function merge(first: any, second: any)  {
    return mergeInternal(first, second).obj;
}

function mergeInternal(first: any, second: any) : { obj: any, deepSame: boolean } {
    const newObj = <any>{};

    // flag that indicates whether the properties are all the same
    // in the second object. If this is the case, we return the second
    // object instead of newly generated one. In this way we are allowing
    // objects to be used by refrenece in some simple casses. For instance
    // if we have an array of objects, and we want to store some element
    // externally, if we use the merge function, storing external value would
    // generate a new object, and we won't be able to use reference to 
    // compare objects, which is sometimes faster way of comparing two objects
    let allSame = true;

    for (const key in first) {
        const hasProperty = second.hasOwnProperty(key);
        if (isObject(first[key])) {
            if (hasProperty)  {
                const nextValue = second[key];
                if (nextValue) {
                    const res = mergeInternal(first[key], nextValue);
                    newObj[key] =  res.obj;
                    allSame = allSame && res.deepSame;
                }
                else
                {
                    newObj[key] =  nextValue;
                }
            }
            else
            {
                newObj[key] = first[key];
                allSame = false;
            }
        }
        else {
            newObj[key] = hasProperty ? second[key] : first[key]
            allSame = allSame && hasProperty;
        }
    }
    
    for (const key in second) {
        if (!first.hasOwnProperty(key)) {
            newObj[key] = second[key];
            allSame = false;
        }
    }

    const ret = { 
        obj: allSame ? second : newObj,
        deepSame: allSame 
    };

    return ret;
}