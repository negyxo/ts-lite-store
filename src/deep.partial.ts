/**
 * This type is allowing to redifine given type as DeepPartial, it is smiliar to
 * Partial but this one goes through object hierarchy. You can find more at:
 * https://stackoverflow.com/questions/45372227/how-to-implement-typescript-deep-partial-mapped-type-not-breaking-array-properti
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer U>
        ? Array<DeepPartial<U>>
        : T[P] extends ReadonlyArray<infer U>
            ? ReadonlyArray<DeepPartial<U>>
            : DeepPartial<T[P]>
};
