import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import type { Category, Product, ActiveStatus, OrderStatus, OrderType } from '../types';

import useAuthStore from '../store/authStore';

const API_BASE = 'http://localhost:5000/api';

export interface Transaction {
  insert: <T extends Record<string, any>>(table: string, data: T) => T & { id: any; _id?: any };
  update: <T extends Record<string, any>>(table: string, id: any, data: Partial<T>) => void;
  remove: (table: string, id: any) => void;
  db?: () => DbState;
}

export interface DbState {
  categories: Category[];
  products: Product[];
  orders: any[];
  users: any[];
  payments: any[];
  order_items: any[];
  ingredients: any[];
  product_ingredients: any[];
  suppliers: any[];
  purchase_orders: any[];
  purchase_order_items: any[];
  inventory_transactions: any[];
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
    categories: [],
    products: [],
    orders: [],
    users: [],
    payments: [],
    order_items: [],
    ingredients: [],
    product_ingredients: [],
    suppliers: [],
    purchase_orders: [],
    purchase_order_items: [],
    inventory_transactions: []
  },
  transact: <R = any>(callback: (tx: Transaction) => R): R => {
    const dummyTx: Transaction = {
      insert: (_table, row) => ({ ...row, id: Date.now() }),
      update: () => {},
      remove: () => {},
      db: () => defaultContextValue.db
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [productIngredients, setProductIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<any[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mutationError, setMutationError] = useState('');
  const sessionToken = useAuthStore(state => state.user?.token);
  const refreshVersion = useRef(0);
  const dataToken = useRef<string | undefined>(undefined);
  const reportMutationError = useCallback((error: unknown) => {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    setMutationError(response?.data?.message || (response?.status === 404
      ? 'Chưa lưu được thay đổi: API cho chức năng này chưa được kết nối (404).'
      : 'Chưa lưu được thay đổi lên máy chủ. Dữ liệu vừa sửa đã được khôi phục.'));
  }, []);

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

  const normalizeIngredients = (raw: any[]): any[] => {
    return raw.map((item: any, idx: number) => {
      const id = item._id || item.id || idx + 1;
      const suppId = item.supplier?._id || item.supplier_id || (typeof item.supplier === 'string' ? item.supplier : null);
      return {
        id,
        _id: item._id || String(id),
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock ?? item.current_stock ?? 0,
        current_stock: item.currentStock ?? item.current_stock ?? 0,
        minStockLevel: item.minStockLevel ?? item.min_stock_level ?? 0,
        min_stock_level: item.minStockLevel ?? item.min_stock_level ?? 0,
        supplier: item.supplier,
        supplier_id: suppId
      };
    });
  };

  const normalizeSuppliers = (raw: any[]): any[] => {
    return raw.map((s: any, idx: number) => {
      const id = s._id || s.id || idx + 1;
      return {
        id,
        _id: s._id || String(id),
        name: s.name,
        phone: s.phone || '',
        address: s.address || '',
        status: s.status || 'ACTIVE'
      };
    });
  };

  const normalizeProductIngredients = (raw: any[]): any[] => {
    return raw.map((item: any, idx: number) => {
      const id = item._id || item.id || idx + 1;
      return {
        id,
        _id: item._id || String(id),
        product_id: item.product?._id || item.product || item.productId || item.product_id,
        productId: item.product?._id || item.product || item.productId || item.product_id,
        ingredient_id: item.ingredient?._id || item.ingredient || item.ingredientId || item.ingredient_id,
        ingredientId: item.ingredient?._id || item.ingredient || item.ingredientId || item.ingredient_id,
        quantity_required: item.quantityRequired ?? item.quantity_required ?? 0,
        quantityRequired: item.quantityRequired ?? item.quantity_required ?? 0,
        product: item.product,
        ingredient: item.ingredient
      };
    });
  };

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const token = useAuthStore.getState().user?.token;
    setLoading(true);
    if (dataToken.current !== token) {
      dataToken.current = token;
      setOrders([]); setUsers([]); setPayments([]); setIngredients([]);
      setProductIngredients([]); setSuppliers([]); setPurchaseOrders([]);
      setPurchaseOrderItems([]); setInventoryTransactions([]);
      setMutationError('');
    }
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
        promises.push(axios.get(`${API_BASE}/ingredients`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/product-ingredients`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/suppliers`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/purchase-orders`, { headers: authHeaders }));
        promises.push(axios.get(`${API_BASE}/inventory-transactions`, { headers: authHeaders }));
      }

      const results = await Promise.allSettled(promises);
      if (version !== refreshVersion.current || token !== useAuthStore.getState().user?.token) return;
      const catRes = results[0];
      const prodRes = results[1];

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
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

      if (results[5]?.status === 'fulfilled' && Array.isArray(results[5].value.data)) {
        setIngredients(normalizeIngredients(results[5].value.data));
      }

      if (results[6]?.status === 'fulfilled' && Array.isArray(results[6].value.data)) {
        setProductIngredients(normalizeProductIngredients(results[6].value.data));
      }

      if (results[7]?.status === 'fulfilled' && Array.isArray(results[7].value.data)) {
        setSuppliers(normalizeSuppliers(results[7].value.data));
      }

      if (results[8]?.status === 'fulfilled' && Array.isArray(results[8].value.data)) {
        setPurchaseOrders(results[8].value.data);
        const poItems = results[8].value.data.flatMap((po: any) =>
          (po.items || []).map((it: any) => ({
            ...it,
            order_id: po._id || po.id,
            ingredient_id: it.ingredient?._id || it.ingredient || it.ingredient_id
          }))
        );
        setPurchaseOrderItems(poItems);
      }

      if (results[9]?.status === 'fulfilled' && Array.isArray(results[9].value.data)) {
        setInventoryTransactions(
          results[9].value.data.map((tx: any) => ({
            ...tx,
            ingredient_id: tx.ingredient?._id || tx.ingredient || tx.ingredient_id
          }))
        );
      }
    } catch (err) {
      console.warn('DbContext refresh error:', err);
    } finally {
      if (version === refreshVersion.current && token === useAuthStore.getState().user?.token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, sessionToken]);

  const setOrderStatus = useCallback(async (orderId: any, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId || o._id === orderId || String(o.id) === String(orderId)) ? { ...o, status } : o)
    );
    try {
      const target = orders.find(o => o.id === orderId || o._id === orderId || String(o.id) === String(orderId));
      const mongoId = target?._id || orderId;
      await axios.put(`${API_BASE}/orders/${mongoId}/status`, { status }, { headers: getAuthHeader() });
    } catch (err) {
      setOrders(orders);
      reportMutationError(err);
    }
  }, [orders, reportMutationError]);

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
      setOrders(orders);
      reportMutationError(err);
    }
  }, [orders, reportMutationError]);

  const transact = useCallback(<R = any>(callback: (tx: Transaction) => R): R => {
    let result: any;

    const tx: Transaction = {
      db: () => ({
        categories,
        products,
        orders,
        users,
        payments,
        order_items: orders.flatMap(o => o.items || []),
        ingredients,
        product_ingredients: productIngredients,
        suppliers,
        purchase_orders: purchaseOrders,
        purchase_order_items: purchaseOrderItems,
        inventory_transactions: inventoryTransactions
      }),

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
              setCategories(prev => prev.filter(category => category.id !== tempId));
              reportMutationError(err);
            });

          return newCat as any;
        }

        if (table === 'ingredients') {
          const tempId = 'temp_' + Date.now();
          const suppId = row.supplier_id ?? row.supplier ?? null;
          const newRow = {
            id: tempId,
            _id: tempId,
            name: row.name,
            unit: row.unit,
            supplier_id: suppId,
            supplier: suppId,
            current_stock: Number(row.current_stock ?? row.currentStock ?? 0),
            currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
            min_stock_level: Number(row.min_stock_level ?? row.minStockLevel ?? 0),
            minStockLevel: Number(row.min_stock_level ?? row.minStockLevel ?? 0),
            ...row
          };

          setIngredients(prev => [...prev, newRow]);

          const payload: any = {
            name: row.name,
            unit: row.unit,
            currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
            minStockLevel: Number(row.min_stock_level ?? row.minStockLevel ?? 0)
          };
          if (suppId) payload.supplier = suppId;

          axios.post(`${API_BASE}/ingredients`, payload, { headers: getAuthHeader() })
            .then(res => {
              if (res.data?._id) {
                setIngredients(prev =>
                  prev.map(i => i.id === tempId ? { ...i, id: res.data._id, _id: res.data._id } : i)
                );
              }
            })
            .catch(err => {
              setIngredients(prev => prev.filter(ingredient => ingredient.id !== tempId));
              reportMutationError(err);
            });

          return newRow as any;
        }

        if (table === 'product_ingredients') {
          const tempId = 'temp_' + Date.now();
          const pId = row.product_id || row.productId || row.product;
          const iId = row.ingredient_id || row.ingredientId || row.ingredient;
          const qty = Number(row.quantity_required ?? row.quantityRequired ?? 1);
          const newRow = {
            id: tempId,
            _id: tempId,
            product_id: pId,
            productId: pId,
            ingredient_id: iId,
            ingredientId: iId,
            quantity_required: qty,
            quantityRequired: qty,
            ...row
          };

          setProductIngredients(prev => [...prev, newRow]);

          axios.post(`${API_BASE}/product-ingredients`, {
            product: pId,
            ingredient: iId,
            quantityRequired: qty
          }, { headers: getAuthHeader() })
            .then(res => {
              if (res.data?._id) {
                setProductIngredients(prev =>
                  prev.map(pi => pi.id === tempId ? { ...pi, id: res.data._id, _id: res.data._id } : pi)
                );
              }
            })
            .catch(err => {
              setProductIngredients(prev => prev.filter(recipe => recipe.id !== tempId));
              reportMutationError(err);
            });

          return newRow as any;
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
              setCategories(categories);
              reportMutationError(err);
            });
        } else if (table === 'ingredients') {
          setIngredients(prev =>
            prev.map(i => {
              if (i.id === id || i._id === id || String(i.id) === String(id)) {
                const suppId = data.supplier_id !== undefined ? data.supplier_id : i.supplier_id;
                return {
                  ...i,
                  ...data,
                  currentStock: data.current_stock !== undefined ? data.current_stock : (data.currentStock !== undefined ? data.currentStock : i.currentStock),
                  current_stock: data.current_stock !== undefined ? data.current_stock : (data.currentStock !== undefined ? data.currentStock : i.current_stock),
                  minStockLevel: data.min_stock_level !== undefined ? data.min_stock_level : (data.minStockLevel !== undefined ? data.minStockLevel : i.minStockLevel),
                  min_stock_level: data.min_stock_level !== undefined ? data.min_stock_level : (data.minStockLevel !== undefined ? data.minStockLevel : i.min_stock_level),
                  supplier_id: suppId,
                  supplier: suppId
                };
              }
              return i;
            })
          );

          const target = ingredients.find(i => i.id === id || i._id === id || String(i.id) === String(id));
          const mongoId = target?._id || id;
          const payload: any = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.unit !== undefined) payload.unit = data.unit;
          if (data.current_stock !== undefined || data.currentStock !== undefined) {
            payload.currentStock = Number(data.current_stock ?? data.currentStock);
          }
          if (data.min_stock_level !== undefined || data.minStockLevel !== undefined) {
            payload.minStockLevel = Number(data.min_stock_level ?? data.minStockLevel);
          }
          if (data.supplier_id !== undefined) {
            payload.supplier = data.supplier_id || null;
          }

          if (mongoId && !String(mongoId).startsWith('temp_')) {
            axios.put(`${API_BASE}/ingredients/${mongoId}`, payload, { headers: getAuthHeader() })
              .catch(err => {
                setIngredients(ingredients);
                reportMutationError(err);
              });
          }
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
              setOrders(orders);
              reportMutationError(err);
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
              setCategories(categories);
              reportMutationError(err);
              refresh();
            });
        } else if (table === 'ingredients') {
          setIngredients(prev =>
            prev.filter(i => i.id !== id && i._id !== id && String(i.id) !== String(id))
          );

          const target = ingredients.find(i => i.id === id || i._id === id || String(i.id) === String(id));
          const mongoId = target?._id || id;
          if (mongoId && !String(mongoId).startsWith('temp_')) {
            axios.delete(`${API_BASE}/ingredients/${mongoId}`, { headers: getAuthHeader() })
              .catch(err => {
                setIngredients(ingredients);
                reportMutationError(err);
              });
          }
        } else if (table === 'product_ingredients') {
          setProductIngredients(prev =>
            prev.filter(pi => pi.id !== id && pi._id !== id && String(pi.id) !== String(id))
          );

          const target = productIngredients.find(pi => pi.id === id || pi._id === id || String(pi.id) === String(id));
          const mongoId = target?._id || id;
          if (mongoId && !String(mongoId).startsWith('temp_')) {
            axios.delete(`${API_BASE}/product-ingredients/${mongoId}`, { headers: getAuthHeader() })
              .catch(err => {
                setProductIngredients(productIngredients);
                reportMutationError(err);
              });
          }
        }
      }
    };

    result = callback(tx);
    return result;
  }, [categories, orders, refresh, ingredients, productIngredients, products, users, payments, suppliers, purchaseOrders, purchaseOrderItems, inventoryTransactions, reportMutationError]);

  const value: DbContextValue = {
    db: {
      categories,
      products,
      orders,
      users,
      payments,
      order_items: orders.flatMap(o => o.items || []),
      ingredients,
      product_ingredients: productIngredients,
      suppliers,
      purchase_orders: purchaseOrders,
      purchase_order_items: purchaseOrderItems,
      inventory_transactions: inventoryTransactions
    },
    transact,
    refresh,
    loading,
    setOrderStatus,
    cancelOrder
  };

  return <DbContext.Provider value={value}>{children}{mutationError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[200] mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-lg"><span>{mutationError}</span><button onClick={() => setMutationError('')} className="shrink-0 font-bold underline">Đóng</button></div>}</DbContext.Provider>;
};

export const useDb = () => {
  return useContext(DbContext);
};

export default DbContext;
