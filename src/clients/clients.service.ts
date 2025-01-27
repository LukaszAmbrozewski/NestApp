import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ClientResponse, Client } from '../interfaces/client';
import { Clients } from './clients.entity';
import { User } from '../user/user.entity';
import { validationNewClientObj } from '../utils/validation-new-client-obj';
import { updateClientObj } from '../utils/update-client-obj';
import { addNewActionToHistory } from '../utils/add-new-action-to-history';
import { Invoices } from '../invoices/invoices.entity';
import { clientNotFound } from '../utils/client-not-found';

@Injectable()
export class ClientsService {
  async getAllClients(user: User): Promise<Client[]> {
    return await Clients.find({
      where: {
        userId: user.id,
      },
    });
  }

  async getOneClient(user: User, clientId: string) {
    const client = await Clients.findOne({
      where: {
        userId: user.id,
        id: clientId,
      },
    });

    if (!client) {
      clientNotFound();
    }
    return client;
  }

  async addClient(newClient: Client, user: User): Promise<ClientResponse> {
    const checkClientByNip = await Clients.findOne({
      where: {
        userId: user.id,
        nip: newClient.nip,
      },
    });

    if (checkClientByNip) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Client is already exist!',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!validationNewClientObj(newClient)) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Invalid data!',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const client = new Clients();

    client.userId = user.id;
    updateClientObj(client, newClient);

    await client.save();
    await addNewActionToHistory(
      user,
      `Dodano nowego kontrahenta: ${newClient.companyName}.`,
    );

    return {
      isSuccess: true,
      id: client.id,
      companyName: client.companyName,
    };
  }

  async removeClient(user: User, clientId: string): Promise<ClientResponse> {
    const client = await Clients.findOne({
      where: {
        userId: user.id,
        id: clientId,
      },
    });

    if (!client) {
      clientNotFound();
    }

    const clientInvoices = await Invoices.find({
      where: {
        clientId: client.id,
      },
    });

    if (clientInvoices.length !== 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Client remove is forbidden before remove client invoices!',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await addNewActionToHistory(
      user,
      `Usunięto kontrahenta: ${client.companyName}.`,
    );

    if (client) {
      await client.remove();

      return {
        isSuccess: true,
        id: client.id,
        companyName: client.companyName,
      };
    }

    return {
      isSuccess: false,
    };
  }

  async patchClient(
    patchedClient: Client,
    user: User,
  ): Promise<ClientResponse> {
    const client = await Clients.findOne({
      where: {
        userId: user.id,
        id: patchedClient.id,
      },
    });

    if (!client) {
      clientNotFound();
    }

    await addNewActionToHistory(
      user,
      `Edytowano dane kontrahenta: ${client.companyName}.`,
    );
    updateClientObj(client, patchedClient);

    if (!validationNewClientObj(client)) {
      return {
        isSuccess: false,
      };
    }

    await client.save();

    return {
      isSuccess: true,
      id: client.id,
      companyName: client.companyName,
    };
  }
}
