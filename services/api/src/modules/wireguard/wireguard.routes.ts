import {
  generateWireGuard,
  downloadWireGuardConfig,
} from './wireguard.controller.js';


export default async function wireguardRoutes(app: any) {

  app.post(
    '/generate',
    generateWireGuard,
  );

  app.get(
    '/config/:deviceId',
    downloadWireGuardConfig,
  );

}
