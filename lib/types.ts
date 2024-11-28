// deno-lint-ignore-file no-explicit-any

/** Primitive types serializable with `JSON.stringify`. */
export type SerializablePrimitive = void | string | number | boolean | null
/** Object with serializable values. */
export interface SerializableObject extends Record<string, SerializablePrimitive | SerializableArray | SerializableObject> { }
/** Array with serializable items. */
export interface SerializableArray extends Array<SerializablePrimitive | SerializableArray | SerializableObject> { }
/** Any type serializable using `JSON.stringify`. */
export type Serializable = SerializablePrimitive | SerializableObject | SerializableArray

/** Function with serializable arguments and return type. Can be both sync and async. */
export type BackendMethod<
    A extends SerializableArray = SerializableArray,
    R extends Serializable = Serializable
> = (...args: A) => (R | Promise<R>)

/** Object with backend methods or sub-schemas as values. */
export interface BackendSchema {
    [name: string]: BackendMethod<any[]> | BackendSchema
}

/** Transforms type of backend method to be always async. */
export type ApiMethod<
    T extends (...args: any[]) => any
> = (...args: Parameters<T>) => ReturnType<T> extends Promise<any> 
    ? ReturnType<T> 
    : Promise<ReturnType<T>>

/** Transforms backend schema to make types of all methods async. */
export type ApiSchema<T extends BackendSchema> = {
    [K in keyof T]: T[K] extends BackendMethod<any[], any> 
        ? ApiMethod<T[K]> 
        : T[K] extends BackendSchema
            ? ApiSchema<T[K]>
            : never
}

