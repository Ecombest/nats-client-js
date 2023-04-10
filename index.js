const { connect, StringCodec } = require("nats");
const { createValidateFunction } = require("./config/validation");

const sc = StringCodec();

class ServiceBroker {
  constructor(config = {}) {
    this.debug = config.debug;
    this.servers = config.servers;
    this.token = config.token;
  }

  async start() {
    try {
      const conn = await connect({
        debug: this.debug,
        servers: this.servers,
        token: this.token,
      });
      this.broker = conn;
      if (this.broker.isClosed()) {
        throw new Error(`Broker is closed`);
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  createService(name, wokers = 1, actionSchemas = []) {
    this._isConnected();

    actionSchemas.forEach(async (actionSchema) => {
      for (let i = 1; i <= wokers; i++) {
        const topic = this._prefixTopic(
          name,
          actionSchema.version,
          actionSchema.name
        );
        this.broker.subscribe(topic, {
          queue: `${topic}-${i}`,
          callback: this._prefixActions(actionSchema),
        });
        console.log(`[${topic}]: Registered topic`);
      }
    });
  }

  emit() {
    const ctx = this;
    return async (topic, payload) => {
      try {
        ctx._isConnected();
        const m = await ctx.broker.request(topic, this._encode(payload));
        const response = this._decode(m.data);
        if (!response.ok) {
          throw new Error(response.message);
        }
        return response;
      } catch (error) {
        throw error;
      }
    };
  }

  /**
   * @returns
   */
  _prefixActions(actionSchema) {
    return async (err, msg) => {
      try {
        if (err) {
          console.error(
            `Action ${msg} exited because of error: ${err.message}`
          );
          return;
        }
        const [broker, service, actionName] = msg.subject.split(".");
        if (actionName === actionSchema.name) {
          let payload = this._decode(msg.data)
          // validate action input
          await createValidateFunction(actionSchema.validate)(payload)
          const ctx = this._context();
          ctx.payload = payload;
          const result = await actionSchema.handle(ctx);

          if (msg.reply) {
            await msg.respond(
              this._encode({
                ok: true,
                result,
              })
            );
          }
          
        }
      } catch (error) {
        await msg.respond(
          this._encode({
            ok: true,
            message: error.message,
          })
        );
      }
    };
  }

  _prefixTopic(name, version, schema) {
    return `v${Number(version) || "1"}.${name}.${schema}`;
  }

  _isConnected() {
    if (!this.broker) {
      throw new Error(`Broker is closed`);
    }
    return true;
  }

  _context() {
    return {
      broker: this.broker,
      emit: this.emit(this),
    };
  }

  _encode(payload) {
    return sc.encode(Buffer.from(JSON.stringify(payload)));
  }

  _decode(payload) {
    return JSON.parse(Buffer.from(payload).toString("utf-8"));
  }
}

module.exports = ServiceBroker;
