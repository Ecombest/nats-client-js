import {
  ConnectionOptions,
  NatsConnection,
  connect,
  StringCodec,
  RequestOptions,
  NatsError,
  Msg,
} from "nats";
import { Action, Service } from "./Service";
import validate from "./validator";

const sc = StringCodec();

class ServiceBroker {
  connectionOptions: ConnectionOptions;
  connection: NatsConnection | any;

  constructor(opts: ConnectionOptions) {
    this.connectionOptions = opts;
    this.connection = null;
  }

  async start() {
    try {
      const connection = await connect(this.connectionOptions);
      this.connection = connection;
      if (this.connection.isClosed()) {
        throw new Error("Service broker started failed!");
      }
      return connection;
    } catch (error) {
      throw error;
    }
  }

  async call(actionName: string, payload?: any, opts?: RequestOptions) {
    this.connection.isClosed();
    let data = this.encode(payload ?? {});
    const m = await this.connection.request(actionName, data, opts);
    const response = this.decode(m.data);
    return response;
  }

  createService(service: Service) {
    service.actions.forEach((action: Action) => {
      this.createAction(action);
    });
  }

  isClosed() {
    if (!this.connection) {
      throw new Error(`Broker is closed`);
    }
    return true;
  }

  private createAction(action: Action) {
    this.isClosed();
    console.log(action.name);
    for (let i = 1; i <= action.workers ?? 1; i++) {
      this.connection.subscribe(action.name, {
        queue: `${action.name}-${i}`,
        callback: this.createActionCallback(action),
        ...action.opts,
      });
    }
  }

  private createActionCallback(action: Action) {
    return async (error: NatsError | null, msg: Msg) => {
      try {
        if (error) throw error;
        // validate payload
        let payload = this.decode(msg.data);
        validate(action.payloadSchema, payload);

        // add payload to ctx
        let ctx: any = this;
        ctx.payload = payload;

        let result = await action.action(ctx);
        msg.respond(this.encode({ data: result }));
      } catch (error) {
        msg.respond(this.encode({ error: true, message: error.message }));
      }
    };
  }

  private encode(payload: any) {
    return sc.encode(JSON.stringify(payload));
  }

  private decode(payload: any) {
    return JSON.parse(Buffer.from(payload).toString("utf-8"));
  }
}

export default ServiceBroker;
