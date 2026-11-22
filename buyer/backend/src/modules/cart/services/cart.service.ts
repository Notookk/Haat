import { Types } from 'mongoose';
import {
  Cart,
  Product,
  AppError,
  type CartAttributes,
} from '@haat/shared-backend';
import {
  resolveUnitPricePaise,
  quantityViolation,
  type AddToCartInput,
  type UpdateCartItemInput,
} from '@haat/shared-contracts';

export interface CartPopulatedItem {
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  sku: string;
  image: string | null;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  moq: number;
  orderMultiple: number;
  stockAvailable: number;
  isWholesale: boolean;
}

export interface SellerCartGroup {
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  items: CartPopulatedItem[];
  subtotalPaise: number;
}

export interface HydratedCartResponse {
  items: CartPopulatedItem[];
  groups: SellerCartGroup[];
  totalAmountPaise: number;
  totalQuantity: number;
}

export async function getOrCreateCart(userId: string): Promise<any> {
  const existing = await Cart.findOne({ userId }).lean();
  if (existing) {
    return existing;
  }
  const created = await Cart.create({ userId, items: [] });
  return created.toObject();
}

export async function getHydratedCart(userId: string): Promise<HydratedCartResponse> {
  const cart: any = await getOrCreateCart(userId);
  if (!cart.items || cart.items.length === 0) {
    return { items: [], groups: [], totalAmountPaise: 0, totalQuantity: 0 };
  }

  const productIds = cart.items.map((i: any) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const populatedItems: CartPopulatedItem[] = [];

  for (const item of cart.items) {
    const product = productMap.get(String(item.productId));
    if (!product || !product.isActive || !product.isApproved) {
      continue;
    }

    let variantStock = 0;
    let variantSku = product.sku;
    let variantPriceModifier = 0;

    if (item.variantId) {
      const variant = product.variants?.find((v) => String(v._id) === String(item.variantId));
      if (variant) {
        variantStock = variant.stockQuantity ?? 0;
        variantSku = variant.sku;
        variantPriceModifier = variant.priceModifierPaise ?? 0;
      }
    } else {
      variantStock = product.variants?.[0]?.stockQuantity ?? 0;
    }

    const baseUnitPaise = (product.retailPricePaise ?? 0) + variantPriceModifier;
    const unitPricePaise = resolveUnitPricePaise(
      baseUnitPaise,
      (product.pricingTiers as any[]) ?? [],
      item.quantity,
    );
    const subtotalPaise = unitPricePaise * item.quantity;
    const isWholesale = unitPricePaise < baseUnitPaise;

    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url ?? product.images?.[0]?.url ?? null;

    populatedItems.push({
      productId: String(product._id),
      variantId: item.variantId ? String(item.variantId) : null,
      title: product.title,
      slug: product.slug,
      sku: variantSku,
      image: primaryImage,
      sellerId: String(product.sellerId),
      sellerName: product.sellerName,
      sellerSlug: product.sellerSlug,
      unitPricePaise,
      quantity: item.quantity,
      subtotalPaise,
      moq: product.moq ?? 1,
      orderMultiple: product.orderMultiple ?? 1,
      stockAvailable: variantStock,
      isWholesale,
    });
  }

  // Group by seller
  const groupsMap = new Map<string, SellerCartGroup>();
  let totalAmountPaise = 0;
  let totalQuantity = 0;

  for (const item of populatedItems) {
    totalAmountPaise += item.subtotalPaise;
    totalQuantity += item.quantity;

    let group = groupsMap.get(item.sellerId);
    if (!group) {
      group = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerSlug: item.sellerSlug,
        items: [],
        subtotalPaise: 0,
      };
      groupsMap.set(item.sellerId, group);
    }
    group.items.push(item);
    group.subtotalPaise += item.subtotalPaise;
  }

  return {
    items: populatedItems,
    groups: Array.from(groupsMap.values()),
    totalAmountPaise,
    totalQuantity,
  };
}

export async function addItemToCart(
  userId: string,
  input: AddToCartInput,
): Promise<HydratedCartResponse> {
  const product = await Product.findById(input.productId).lean();
  if (!product || !product.isActive || !product.isApproved) {
    throw AppError.notFound('Product is unavailable or archived.');
  }

  const violation = quantityViolation(input.quantity, {
    moq: product.moq ?? 1,
    orderMultiple: product.orderMultiple ?? 1,
  });
  if (violation) {
    throw AppError.badRequest(violation);
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const targetVariantId = input.variantId ? String(input.variantId) : null;
  const existingItemIndex = cart.items.findIndex((item) => {
    const itemVar = item.variantId ? String(item.variantId) : null;
    return String(item.productId) === input.productId && itemVar === targetVariantId;
  });

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += input.quantity;
  } else {
    cart.items.push({
      productId: new Types.ObjectId(input.productId),
      variantId: targetVariantId ? new Types.ObjectId(targetVariantId) : null,
      quantity: input.quantity,
      addedAt: new Date(),
    });
  }

  await cart.save();
  return getHydratedCart(userId);
}

export async function updateCartItem(
  userId: string,
  productId: string,
  input: UpdateCartItemInput,
): Promise<HydratedCartResponse> {
  const product = await Product.findById(productId).lean();
  if (!product || !product.isActive) {
    throw AppError.notFound('Product is unavailable.');
  }

  const violation = quantityViolation(input.quantity, {
    moq: product.moq ?? 1,
    orderMultiple: product.orderMultiple ?? 1,
  });
  if (violation) {
    throw AppError.badRequest(violation);
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw AppError.notFound('Cart is empty.');
  }

  const targetVariantId = input.variantId ? String(input.variantId) : null;
  const item = cart.items.find((i) => {
    const itemVar = i.variantId ? String(i.variantId) : null;
    return String(i.productId) === productId && (!targetVariantId || itemVar === targetVariantId);
  });

  if (!item) {
    throw AppError.notFound('Item not in cart.');
  }

  item.quantity = input.quantity;
  await cart.save();
  return getHydratedCart(userId);
}

export async function removeCartItem(
  userId: string,
  productId: string,
  variantId?: string | null,
): Promise<HydratedCartResponse> {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { items: [], groups: [], totalAmountPaise: 0, totalQuantity: 0 };
  }

  const targetVariantId = variantId ? String(variantId) : null;
  cart.items = cart.items.filter((i) => {
    const itemVar = i.variantId ? String(i.variantId) : null;
    const match = String(i.productId) === productId && (!targetVariantId || itemVar === targetVariantId);
    return !match;
  }) as any;

  await cart.save();
  return getHydratedCart(userId);
}

export async function clearCart(userId: string): Promise<HydratedCartResponse> {
  await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, { upsert: true });
  return { items: [], groups: [], totalAmountPaise: 0, totalQuantity: 0 };
}
