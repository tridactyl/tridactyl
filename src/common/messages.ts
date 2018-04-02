type MessagePriority = 'info' | 'warn' | 'error'

interface _Message {
    priority: MessagePriority
    msg: string
}

export type Message = Readonly<_Message>
export type Priority = MessagePriority