interface Action {
  name: string;
  action: (ctx: any) => Promise<any>;
  payloadSchema: any;
  workers: number;
  opts?: { max?: number; timeout?: number };
}

class Service {
  name: string;
  version: number;
  actions: Action[];
  constructor(name: string, version: number, actions: Action[] = []) {
    this.name = name;
    this.version = version;
    actions.forEach((action) => {
      action.name = `v${this.version}.${this.name}.${action.name}`;
    });
    this.actions = actions;
  }

  createAction(action: Action) {
    action.name = `v${this.version}.${this.name}.${action.name}`;
    this.actions = [...this.actions, action];
  }
}

export { Service, Action };
