// deno-lint-ignore-file no-explicit-any
import type { Serializable, SerializableArray } from "./types.ts";

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Message<T extends string = string> { type: T }
export type MessageFilter <T extends Message> = Message<T['type']> & DeepPartial<T>
export type MessageListener = [MessageFilter<any>, (v: any) => void];

export interface BackendDescription extends Record<string, 'function' | 'generator' | BackendDescription> { }
export interface MessageBackendDescription extends Message<'description'> { module: BackendDescription }

interface MessageMethodId <T extends string> extends Message<T> { id: number }

export interface MessageMethodCall extends MessageMethodId<'method call'> { args: SerializableArray, method: string }
export interface MessageMethodResult <R extends Serializable = Serializable> extends MessageMethodId<'method result'> { result: R }
export interface MessageMethodError extends MessageMethodId<'method result'> { error: string }

export interface MessageGeneratorStarted extends MessageMethodId<'method start'> { }
export interface MessageGeneratorNext extends MessageMethodId<'method next'> { id: number, args: Serializable }
export interface MessageGeneratorDone extends MessageMethodId<'method result'> { done: boolean }
