
/**
 * Compares two objects deeply. Objects can differ in number of properties
 * but all properties that are matched (in whatever hierarchy level) must
 * be the same in order for this function to return true, otherwise, if any
 * given property (in a hierarchy) is different, it will return false
 * @param partialObject
 * @param object
 */
export function isDeepEqual(partialObject: any, object: any) {

    // it's just the same object. No need to compare.
    if (partialObject === object)
        return true;

    if (partialObject === undefined || object === undefined)
        return false;

    if (partialObject === null || object === null)
        return false;

    if ( shouldDirectCheck(partialObject) &&  shouldDirectCheck(object))
        return partialObject === object;

    // compare objects with same number of keys
    for (const key in partialObject) {
        // other object doesn't have this prop, this shouldn't
        // happen, as partial object is always subset of object
        // but just in case, we handle this by signalig differences
        if (!(key in object))
            return false;

        if (!isDeepEqual(partialObject[key], object[key]))
            return false;
    }

    return true;
}

// this function is telling us whether we should check
// the objects againts their reference or value, or proceed
// testing it as an object (for instnace, value type, data
// and array are check directly, although date and array types
// are objects, we don't wanna go and loop inside these ovbjects)
function shouldDirectCheck(obj: any) {
    return (obj !== Object(obj) || (obj instanceof Date) || Array.isArray(obj));
}
