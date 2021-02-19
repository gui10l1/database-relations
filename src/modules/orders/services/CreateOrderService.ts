import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found!');
    }

    const productsIds = products.map(item => item.id);

    const productsFromDatabase = await this.productsRepository.findAllById(
      products,
    );

    if (productsIds.length !== productsFromDatabase.length) {
      throw new AppError('One of your products was not found!');
    }

    productsFromDatabase.forEach(product => {
      const productFromClient = products.find(item => item.id === product.id);

      if (!productFromClient) {
        return;
      }

      if (productFromClient.quantity > product.quantity) {
        throw new AppError('Insuffient quantity!');
      }
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: products.map(item => {
        const findProduct = productsFromDatabase.find(i => i.id === item.id);

        if (!findProduct) {
          throw new Error();
        }

        return {
          price: findProduct.price,
          product_id: item.id,
          quantity: item.quantity,
        };
      }),
    });

    return order;
  }
}

export default CreateOrderService;
