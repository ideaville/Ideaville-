import type {
  AuthUser,
  CommercialTerm,
  Distributor,
  Order,
  OrderLine,
  PaymentEvent,
  Product,
  ProductPrice,
  Session,
  Settings,
  StockBatch,
  StockMovement,
  User,
} from '../types.ts'

export type PlaceOrderInput = {
  channel: 'retail' | 'trade'
  buyer: AuthUser | null
  distributorId: string | null
  lines: Array<{ product_id: string; quantity: number }>
  notes?: string
}

export type PlaceOrderResult = {
  order: Order
  lines: OrderLine[]
}

export interface OmegaStore {
  readonly kind: 'memory' | 'postgres'
  readiness(): Promise<{
    persistence: 'memory' | 'postgres' | 'unconfigured'
    migrated: boolean
    message: string
  }>
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>, actor: AuthUser): Promise<Settings>

  createUser(input: Omit<User, 'created_at'> & { created_at?: string }): Promise<User>
  findUserByEmail(email: string): Promise<User | null>
  findUserById(id: string): Promise<User | null>
  listUsers(): Promise<User[]>

  createSession(session: Session): Promise<Session>
  findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null>
  deleteSession(id: string): Promise<void>

  createDistributor(d: Distributor): Promise<Distributor>
  listDistributors(): Promise<Distributor[]>
  getDistributor(id: string): Promise<Distributor | null>
  updateDistributor(id: string, patch: Partial<Distributor>): Promise<Distributor>

  createProduct(p: Product): Promise<Product>
  listProducts(): Promise<Product[]>
  getProduct(id: string): Promise<Product | null>
  updateProduct(id: string, patch: Partial<Product>): Promise<Product>

  createPrice(price: ProductPrice): Promise<ProductPrice>
  listPrices(productId?: string): Promise<ProductPrice[]>
  activatePrice(priceId: string, actor: AuthUser): Promise<ProductPrice>

  createBatch(batch: StockBatch): Promise<StockBatch>
  listBatches(productId?: string): Promise<StockBatch[]>
  adjustStock(input: {
    batchId: string
    deltaOnHand: number
    reason: string
    actor: AuthUser
  }): Promise<StockBatch>

  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>
  listOrders(filter?: { distributorId?: string; buyerUserId?: string }): Promise<Order[]>
  getOrder(id: string): Promise<{ order: Order; lines: OrderLine[] } | null>
  setPaymentStatus(input: {
    orderId: string
    paymentStatus: Order['payment_status']
    eventKind: PaymentEvent['kind']
    note: string
    actor: AuthUser
  }): Promise<{ order: Order; event: PaymentEvent }>
  setFulfillmentStatus(input: {
    orderId: string
    fulfillmentStatus: Order['fulfillment_status']
    actor: AuthUser
  }): Promise<Order>

  createTerm(term: CommercialTerm): Promise<CommercialTerm>
  listTerms(distributorId?: string | null): Promise<CommercialTerm[]>
  activateTerm(termId: string, actor: AuthUser): Promise<CommercialTerm>

  listMovements(orderId?: string): Promise<StockMovement[]>
}
