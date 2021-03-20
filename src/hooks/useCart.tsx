import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
  finalizeRequest: () => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getProduct = async (productId: number) => {
    const { data } = await api.get(`products/${productId}`);
    
    if (!data) {
      return;
    }
    
    return data;
  }

  const finalizeRequest = () => {
    setCart([]);

    localStorage.setItem(
      '@RocketShoes:cart',
      JSON.stringify([])
    );

    toast.success('Pedido finalizado com sucesso');
  }

  const findProductInTheCart = (productId: number) => {
    return cart.find(product => product.id === productId);
  }

  const addProduct = async (productId: number) => {
    try {
      const productInTheCart = findProductInTheCart(productId);

      if (productInTheCart)  {
        updateProductAmount({
          productId,
          amount: productInTheCart.amount + 1
        });
      } else {
        const data = await getProduct(productId);
        const newArray = [...cart, {...data, amount: 1}];

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(newArray)
        );
  
        setCart(newArray);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const findProductInCart = findProductInTheCart(productId);

      if (!findProductInCart) {
        toast.error('Erro na remoção do produto');

        return;
      }

      const newArray = cart.filter(product => product.id !== productId);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(newArray)
      );

      setCart(newArray);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const verifyStock = async (productId: number, amount: number) => {
    const { data: productInStock } = await api.get(`stock/${productId}`);

    if (productInStock.amount < amount) {
      toast.error('Quantidade solicitada fora de estoque');

      return true;
    }

    return false;
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const findProductInCart = findProductInTheCart(productId);

      if (!findProductInCart || amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');

        return;
      }

      if (await verifyStock(productId, amount)) {
        return;
      }

      const newArray = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }

        return product;
      });

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(newArray)
      );

      setCart(newArray);
    } catch  {
      toast.error('Erro ao atualizar pedido do carrinho');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount, finalizeRequest }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
