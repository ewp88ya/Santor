import {
  createDeviceController,
  listDeviceController,
  detailDeviceController,
} from './device.controller.js';

export default async function deviceRoutes(app: any) {
  app.post('/', async (request: any) => {
    return createDeviceController(request.body);
  });

  app.get('/:id', async (request: any) => {
    return detailDeviceController(request.params.id);
  });

  app.get('/vpn/:vpnAccessId', async (request: any) => {
    return listDeviceController(request.params.vpnAccessId);
  });
}
