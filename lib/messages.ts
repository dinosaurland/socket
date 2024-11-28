import type { Serializable, SerializableArray } from "./types.ts";

export interface Message<T extends string = string> { type: T }

export interface BackendDescription extends Record<string, true | BackendDescription> { }
export interface MessageBackendDescription extends Message<'description'> { module: BackendDescription }

interface MessageMethod <T extends string> extends Message<T> { id: number }
export interface MessageMethodCall extends MessageMethod<'method call'> { args: SerializableArray, method: string }
export interface MessageMethodResult <R extends Serializable = Serializable> extends MessageMethod<'method result'> { result: R }
export interface MessageMethodError extends MessageMethod<'method result'> { error: string }