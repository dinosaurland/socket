// deno-lint-ignore-file no-explicit-any

/** Primitive types serializable with `JSON.stringify`. */
export type SerializablePrimitive = void | string | number | boolean | null | undefined | unknown
/** Object with serializable values. */
export interface SerializableObject extends Record<string, SerializablePrimitive | SerializableArray | SerializableObject> { }
/** Array with serializable items. */
export interface SerializableArray extends Array<SerializablePrimitive | SerializableArray | SerializableObject> { }
/** Any type serializable using `JSON.stringify`. */
export type Serializable = SerializablePrimitive | SerializableObject | SerializableArray

/** Function with serializable arguments and return type. Can be both sync and async. */
export type BackendMethod<
    A extends SerializableArray = any[],
    R extends Serializable = unknown
> = (...args: A) => (R | Promise<R>)

export type BackendGeneratorMethod<
    Yielded extends Serializable = unknown,
    Returned extends Serializable = any,
    Args extends SerializableArray = any[],
    NextArgs extends Serializable = any
> = (...args: Args) => AsyncGenerator<Yielded, Returned, NextArgs>

/** Object with backend methods or sub-schemas as values. */
export interface BackendSchema {
    [name: string]: BackendMethod | BackendGeneratorMethod | BackendSchema
}


/** Transforms type of backend method to be always async. */
export type ApiMethod<
    T extends (...args: any[]) => any
> = (...args: Parameters<T>) => ReturnType<T> extends Promise<any> 
    ? ReturnType<T> 
    : Promise<ReturnType<T>>;

export type ApiGeneratorMethod<
    T extends BackendGeneratorMethod = BackendGeneratorMethod
> = T

export type ApiSchema<T extends BackendSchema> = {
    [K in keyof T]: T[K] extends BackendGeneratorMethod
        ? ApiGeneratorMethod<T[K]>
        : T[K] extends BackendMethod
            ? ApiMethod<T[K]>
            : T[K] extends BackendSchema
                ? ApiSchema<T[K]>
                : never
}

