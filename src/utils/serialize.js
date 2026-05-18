/** Convert Prisma Decimal fields to numbers in JSON responses */
export function decimalToNumber(value) {
  if (value == null) return null;
  return Number(value);
}

export function mapUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function mapOrder(order) {
  if (!order) return null;
  return {
    ...order,
    estimatedTotal: decimalToNumber(order.estimatedTotal),
    finalTotal: decimalToNumber(order.finalTotal),
    lineItems: order.lineItems?.map((li) => ({
      ...li,
      unitPrice: decimalToNumber(li.unitPrice),
      lineTotal: decimalToNumber(li.lineTotal),
    })),
    adjustments: order.adjustments?.map((a) => ({
      ...a,
      amountDelta: decimalToNumber(a.amountDelta),
    })),
  };
}

export function mapProduct(product) {
  if (!product) return null;
  return { ...product, basePrice: decimalToNumber(product.basePrice) };
}
