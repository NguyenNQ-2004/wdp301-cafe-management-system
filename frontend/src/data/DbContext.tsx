import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import type { Category, Product, ActiveStatus, OrderStatus, OrderType } from '../types';

import useAuthStore from '../store/authStore';

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 1,
    _id: 'cat-1',
    name: 'Cà phê máy',
    icon: 'coffee_maker',
    description: 'Espresso, Caramel Macchiato đậm đà chuẩn gu hiện đại.',
    image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  },
  {
    id: 2,
    _id: 'cat-2',
    name: 'Cà phê truyền thống',
    icon: 'local_cafe',
    description: 'Cà phê muối, sữa đá Sài Gòn ủ phin nguyên bản ngọt êm.',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  },
  {
    id: 3,
    _id: 'cat-3',
    name: 'Trà trái cây',
    icon: 'emoji_food_beverage',
    description: 'Trà đào cam sả, hoa quả nhiệt đới tươi mát thanh nhiệt.',
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  },
  {
    id: 4,
    _id: 'cat-4',
    name: 'Đá xay & Matcha',
    icon: 'icecream',
    description: 'Matcha Uji thơm bùi, đá xay mát lạnh đánh tan ngày hè.',
    image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  },
  {
    id: 5,
    _id: 'cat-5',
    name: 'Bánh ngọt',
    icon: 'bakery_dining',
    description: 'Bánh Croissant nướng bơ Pháp, cheesecake mềm béo hấp dẫn.',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  },
  {
    id: 6,
    _id: 'cat-6',
    name: 'Đóng chai',
    icon: 'liquor',
    description: 'Cold brew ủ lạnh 16h đóng chai tiện lợi mang đi bất cứ đâu.',
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE'
  }
];

export interface Transaction {
  insert: <T extends Record<string, any>>(table: string, data: T) => T & { id: any; _id?: any };
  update: <T extends Record<string, any>>(table: string, id: any, data: Partial<T>) => void;
  remove: (table: string, id: any) => void;
}

export interface DbState {
  categories: Category[];
  products: Product[];
  orders: any[];
  users: any[];
  payments: any[];
  order_items: any[];
  [key: string]: any[];
}

export interface DbContextValue {
  db: DbState;
  transact: <R = any>(callback: (tx: Transaction) => R) => R;
  refresh: () => Promise<void>;
  loading: boolean;
  setOrderStatus: (orderId: any, status: OrderStatus) => Promise<void> | void;
  cancelOrder: (orderId: any, reason: string) => Promise<void> | void;
}

const defaultContextValue: DbContextValue = {
  db: {
    categories: DEFAULT_CATEGORIES,
    products: [],
    orders: [],
    users: [],
    payments: [],
    order_items: []
  },
  transact: <R = any>(callback: (tx: Transaction) => R): R => {
    const dummyTx: Transaction = {
      insert: (_table, row) => ({ ...row, id: Date.now() }),
      update: () => {},
      remove: () => {}
    };
    return callback(dummyTx);
  },
  refresh: async () => {},
  loading: false,
  setOrderStatus: async () => {},
  cancelOrder: async () => {}
};

export const DbContext = createContext<DbContextValue>(defaultContextValue);

export const DbContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getAuthHeader = () => {
    const user = useAuthStore.getState().user;
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  };

  const normalizeCategories = (rawCats: any[]): Category[] => {
    return rawCats.map((c: any, idx: number) => ({
      id: c._id || c.id || idx + 1,
      _id: c._id || String(c.id || idx + 1),
      name: c.name,
      icon: c.icon || 'local_cafe',
      description: c.description || null,
      image_url: c.image_url || c.imageUrl || null,
      imageUrl: c.imageUrl || c.image_url || null,
      status: (c.status || 'ACTIVE') as ActiveStatus
    }));
  };

  const normalizeProducts = (rawProds: any[]): Product[] => {
    return rawProds.map((p: any, idx: number) => {
      const catId = p.category?._id || p.category_id || p.category;
      return {
        id: p._id || p.id || idx + 1,
        _id: p._id || String(p.id || idx + 1),
        category_id: catId,
        category: p.category,
        name: p.name,
        price: p.basePrice || p.price || 0,
        basePrice: p.basePrice || p.price || 0,
        base_price: p.basePrice || p.price || 0,
        imageUrl: p.imageUrl || p.image_url || '',
        image_url: p.image_url || p.imageUrl || '',
        status: p.status || (p.isAvailable ? 'ACTIVE' : 'INACTIVE'),
        isAvailable: p.isAvailable !== undefined ? p.isAvailable : (p.is_available !== undefined ? p.is_available : true),
        is_available: p.is_available !== undefined ? p.is_available : (p.isAvailable !== undefined ? p.isAvailable : true),
        badge: p.badge,
        subtitle: p.subtitle,
        description: p.description,
        variantsConfig: p.variantsConfig || p.variants_config,
        variants_config: p.variants_config || p.variantsConfig,
        recipe: p.recipe
      };
    });
  };

  const normalizeOrders = (rawOrders: any[]): any[] => {
    return rawOrders.map((o: any, idx: number) => {
      const orderId = o._id || o.id || idx + 1;
      return {
        id: orderId,
        _id: orderId,
        order_code: o.orderCode || o.order_code || `ORD-${orderId}`,
        orderCode: o.orderCode || o.order_code || `ORD-${orderId}`,
        created_at: o.createdAt || o.created_at || new Date().toISOString(),
        createdAt: o.createdAt || o.created_at || new Date().toISOString(),
        order_type: (o.orderType || o.order_type || 'DINE_IN') as OrderType,
        orderType: (o.orderType || o.order_type || 'DINE_IN') as OrderType,
        table_number: o.tableNumber || o.table_number || null,
        tableNumber: o.tableNumber || o.table_number || null,
        customer_id: o.customer?._id || o.customer_id || (typeof o.customer === 'string' ? o.customer : null),
        customer: o.customer,
        cashier_id: o.cashier?._id || o.cashier_id || (typeof o.cashier === 'string' ? o.cashier : null),
        cashier: o.cashier,
        shipper_id: o.shipper?._id || o.shipper_id || (typeof o.shipper === 'string' ? o.shipper : null),
        shipper: o.shipper,
        total_amount: o.totalAmount ?? o.total_amount ?? 0,
        totalAmount: o.totalAmount ?? o.total_amount ?? 0,
        discount_amount: o.discountAmount ?? o.discount_amount ?? 0,
        discountAmount: o.discountAmount ?? o.discount_amount ?? 0,
        delivery_fee: o.deliveryFee ?? o.delivery_fee ?? 0,
        deliveryFee: o.deliveryFee ?? o.delivery_fee ?? 0,
        final_amount: o.finalAmount ?? o.final_amount ?? 0,
        finalAmount: o.finalAmount ?? o.final_amount ?? 0,
        payment_method: o.paymentMethod || o.payment_method || 'CASH',
        paymentMethod: o.paymentMethod || o.payment_method || 'CASH',
        status: (o.status || 'PENDING') as OrderStatus,
        recipient_name: o.recipientName || o.recipient_name || '',
        recipientName: o.recipientName || o.recipient_name || '',
        recipient_phone: o.recipientPhone || o.recipient_phone || '',
        recipientPhone: o.recipientPhone || o.recipient_phone || '',
        delivery_address: o.deliveryAddress || o.delivery_address || '',
        deliveryAddress: o.deliveryAddress || o.delivery_address || '',
        order_note: o.orderNote || o.order_note || '',
        orderNote: o.orderNote || o.order_note || '',
        cancel_reason: o.cancelReason || o.cancel_reason || '',
        cancelReason: o.cancelReason || o.cancel_reason || '',
        items: o.items || []
      };
    });
  };

  const normalizeUsers = (rawUsers: any[]): any[] => {
    return rawUsers.map((u: any, idx: number) => {
      const uId = u._id || u.id || idx + 1;
      return {
        id: uId,
        _id: uId,
        full_name: u.fullName || u.full_name || u.name || 'Người dùng',
        fullName: u.fullName || u.full_name || u.name || 'Người dùng',
        phone: u.phone || '',
        position: u.position || 'STAFF',
        status: u.status || 'ACTIVE',
        role: u.role || 'STAFF'
      };
    });
  };

  const refresh = useCallback(async () => {
    try {
      const authHeaders = getAuthHeader();
      const promises: Promise<any>[] = [
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/products`)
      ];

      if (authHeaders.Authorization) {
        promises.push(axios.get(`${API_BASE}/orders`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/employees`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/payments`, { headers: authHeaders }));
      }

      const results = await Promise.allSettled(promises);
      const catRes = results[0];
      const prodRes = results[1];

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data) && catRes.value.data.length > 0) {
        setCategories(normalizeCategories(catRes.value.data));
      }

      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)) {
        setProducts(normalizeProducts(prodRes.value.data));
      }

      if (results[2]?.status === 'fulfilled' && Array.isArray(results[2].value.data)) {
        setOrders(normalizeOrders(results[2].value.data));
      }

      if (results[3]?.status === 'fulfilled' && Array.isArray(results[3].value.data)) {
        setUsers(normalizeUsers(results[3].value.data));
      }

      if (results[4]?.status === 'fulfilled' && Array.isArray(results[4].value.data)) {
        setPayments(results[4].value.data);
      }
    } catch (err) {
      console.warn('DbContext refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setOrderStatus = useCallback(async (orderId: any, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId || o._id === orderId || String(o.id) === String(orderId)) ? { ...o, status } : o)
    );
    try {
      const target = orders.find(o => o.id === orderId || o._id === orderId || String(o.id) === String(orderId));
      const mongoId = target?._id || orderId;
      await axios.put(`${API_BASE}/orders/${mongoId}/status`, { status }, { headers: getAuthHeader() });
    } catch (err) {
      console.error('Failed to update order status on server:', err);
    }
  }, [orders]);

  const cancelOrder = useCallback(async (orderId: any, reason: string) => {
    setOrders(prev =>
      prev.map(o =>
        (o.id === orderId || o._id === orderId || String(o.id) === String(orderId))
          ? { ...o, status: 'CANCELLED' as OrderStatus, cancel_reason: reason, cancelReason: reason }
          : o
      )
    );
    try {
      const target = orders.find(o => o.id === orderId || o._id === orderId || String(o.id) === String(orderId));
      const mongoId = target?._id || orderId;
      await axios.put(`${API_BASE}/orders/${mongoId}/status`, { status: 'CANCELLED', cancelReason: reason }, { headers: getAuthHeader() });
    } catch (err) {
      console.error('Failed to cancel order on server:', err);
    }
  }, [orders]);

  const transact = useCallback(<R = any>(callback: (tx: Transaction) => R): R => {
    let result: any;

    const tx: Transaction = {
      insert: (table, row) => {
        if (table === 'categories') {
          const tempId = 'temp_' + Date.now();
          const newCat: Category = {
            id: tempId,
            _id: tempId,
            name: row.name,
            icon: row.icon || 'local_cafe',
            description: row.description || null,
            image_url: row.image_url || row.imageUrl || null,
            imageUrl: row.imageUrl || row.image_url || null,
            status: row.status || 'ACTIVE'
          };

          setCategories(prev => [...prev, newCat]);

          // Sync to backend
          axios.post(`${API_BASE}/categories`, {
            name: row.name,
            icon: row.icon,
            description: row.description,
            imageUrl: row.image_url || row.imageUrl,
            image_url: row.image_url || row.imageUrl,
            status: row.status
          }, { headers: getAuthHeader() })
            .then(res => {
              if (res.data?._id) {
                setCategories(prev =>
                  prev.map(c => c.id === tempId ? {
                    ...c,
                    id: res.data._id,
                    _id: res.data._id,
                    imageUrl: res.data.imageUrl || c.imageUrl,
                    image_url: res.data.image_url || c.image_url
                  } : c)
                );
              }
            })
            .catch(err => {
              console.error('Failed to insert category on server:', err);
            });

          return newCat as any;
        }

        // Generic insert fallback
        const genericItem = { ...row, id: Date.now() };
        return genericItem;
      },

      update: (table, id, data) => {
        if (table === 'categories') {
          setCategories(prev =>
            prev.map(c => {
              if (c.id === id || c._id === id || String(c.id) === String(id)) {
                return {
                  ...c,
                  ...data,
                  image_url: data.image_url !== undefined ? data.image_url : c.image_url,
                  imageUrl: data.image_url !== undefined ? data.image_url : (data.imageUrl !== undefined ? data.imageUrl : c.imageUrl)
                };
              }
              return c;
            })
          );

          // Find mongo _id
          const target = categories.find(c => c.id === id || c._id === id || String(c.id) === String(id));
          const mongoId = target?._id || id;

          axios.put(`${API_BASE}/categories/${mongoId}`, {
            ...data,
            imageUrl: data.image_url !== undefined ? data.image_url : data.imageUrl,
            image_url: data.image_url !== undefined ? data.image_url : data.imageUrl
          }, { headers: getAuthHeader() })
            .catch(err => {
              console.error('Failed to update category on server:', err);
            });
        } else if (table === 'orders') {
          setOrders(prev =>
            prev.map(o => {
              if (o.id === id || o._id === id || String(o.id) === String(id)) {
                return { ...o, ...data };
              }
              return o;
            })
          );

          const target = orders.find(o => o.id === id || o._id === id || String(o.id) === String(id));
          const mongoId = target?._id || id;
          if (data.shipper_id !== undefined || data.shipperId !== undefined) {
            axios.put(
              `${API_BASE}/orders/${mongoId}/status`,
              {
                status: target?.status || 'PENDING',
                shipperId: data.shipper_id !== undefined ? data.shipper_id : data.shipperId
              },
              { headers: getAuthHeader() }
            ).catch(err => {
              console.error('Failed to update shipper on server:', err);
            });
          }
        }
      },

      remove: (table, id) => {
        if (table === 'categories') {
          const target = categories.find(c => c.id === id || c._id === id || String(c.id) === String(id));
          const mongoId = target?._id || id;

          setCategories(prev => prev.filter(c => c.id !== id && c._id !== id && String(c.id) !== String(id)));

          axios.delete(`${API_BASE}/categories/${mongoId}`, { headers: getAuthHeader() })
            .catch(err => {
              console.error('Failed to remove category on server:', err);
              refresh();
            });
        }
      }
    };

    result = callback(tx);
    return result;
  }, [categories, orders, refresh]);

  const value: DbContextValue = {
    db: {
      categories,
      products,
      orders,
      users,
      payments,
      order_items: orders.flatMap(o => o.items || [])
    },
    transact,
    refresh,
    loading,
    setOrderStatus,
    cancelOrder
  };

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
};

export const useDb = () => {
  return useContext(DbContext);
};

export default DbContext;
