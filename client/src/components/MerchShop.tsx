import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  CreditCard,
  Wallet,
  Check,
  Package,
  Coffee,
  Shirt,
} from "lucide-react";
import { SiSolana } from "react-icons/si";
import type { Product, CartItem } from "@shared/schema";

const PRODUCTS: Product[] = [
  {
    id: "hoodie-black",
    name: "Normie Hoodie",
    description: "Premium black hoodie with embroidered $NORMIE logo. Stay cozy while you HODL.",
    priceUSD: 79.99,
    priceSol: 0.42,
    image: "hoodie",
    category: "apparel",
    inStock: true,
  },
  {
    id: "coffee-mug",
    name: "Diamond Hands Mug",
    description: "Ceramic mug for your morning brew. Features 'NORMIES UNITE' slogan.",
    priceUSD: 24.99,
    priceSol: 0.13,
    image: "mug",
    category: "drinkware",
    inStock: true,
  },
  {
    id: "joggers",
    name: "Normie Joggers",
    description: "Comfortable joggers with subtle $NORMIE branding. Perfect for raids.",
    priceUSD: 59.99,
    priceSol: 0.32,
    image: "joggers",
    category: "apparel",
    inStock: true,
  },
  {
    id: "beanie",
    name: "Crypto Beanie",
    description: "Warm knit beanie with embroidered logo. Stay warm, stay bullish.",
    priceUSD: 29.99,
    priceSol: 0.16,
    image: "beanie",
    category: "accessories",
    inStock: true,
  },
  {
    id: "cologne",
    name: "Normie Cologne",
    description: "Signature scent for the sophisticated degen. Notes of success and diamond hands.",
    priceUSD: 89.99,
    priceSol: 0.47,
    image: "cologne",
    category: "lifestyle",
    inStock: true,
  },
  {
    id: "bag",
    name: "HODL Backpack",
    description: "Durable backpack for carrying your laptop and dreams of Lambo.",
    priceUSD: 49.99,
    priceSol: 0.26,
    image: "bag",
    category: "accessories",
    inStock: true,
  },
];

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  hoodie: <Shirt className="h-16 w-16" />,
  mug: <Coffee className="h-16 w-16" />,
  joggers: <Shirt className="h-16 w-16" />,
  beanie: <Package className="h-16 w-16" />,
  cologne: <Package className="h-16 w-16" />,
  bag: <Package className="h-16 w-16" />,
};

export function MerchShop() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment" | "success">("cart");
  const [paymentMethod, setPaymentMethod] = useState<"solana" | "stripe">("solana");

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      return total + (product?.priceUSD || 0) * item.quantity;
    }, 0);
  };

  const getCartTotalSol = () => {
    return cart.reduce((total, item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      return total + (product?.priceSol || 0) * item.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    setCheckoutStep("payment");
  };

  const handlePaymentSubmit = () => {
    setTimeout(() => {
      setCheckoutStep("success");
      setCart([]);
    }, 1500);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep("cart");
  };

  return (
    <section id="shop" className="py-8 lg:py-12 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-mono font-bold uppercase tracking-tight">
              MERCH EMPIRE
            </h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              Gear up for the revolution. All proceeds fund buybacks.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsCheckoutOpen(true)}
            className="relative"
            data-testid="button-cart"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden group hover-elevate"
              data-testid={`card-product-${product.id}`}
            >
              <div className="aspect-square bg-gradient-to-br from-muted to-background flex items-center justify-center relative">
                <div className="text-primary/50 group-hover:text-primary/70 transition-colors">
                  {PRODUCT_ICONS[product.image]}
                </div>
                <Badge className="absolute top-3 right-3 font-mono">
                  ${product.priceUSD}
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-mono font-bold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
                    <SiSolana className="h-3 w-3" />
                    <span>{product.priceSol} SOL</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addToCart(product)}
                    data-testid={`button-add-to-cart-${product.id}`}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="max-w-md">
            {checkoutStep === "cart" && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-mono">Your Cart</DialogTitle>
                  <DialogDescription>
                    Review your items before checkout
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-mono">Your cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {cart.map((item) => {
                          const product = PRODUCTS.find((p) => p.id === item.productId);
                          if (!product) return null;
                          return (
                            <div
                              key={item.productId}
                              className="flex items-center justify-between gap-3 p-3 bg-muted rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-background rounded-md flex items-center justify-center text-primary/50">
                                  {PRODUCT_ICONS[product.image]}
                                </div>
                                <div>
                                  <p className="font-mono font-medium text-sm">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity} x ${product.priceUSD}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.productId)}
                                data-testid={`button-remove-${item.productId}`}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-muted-foreground">Total</span>
                          <div className="text-right">
                            <p className="font-mono font-bold text-lg">
                              ${getCartTotal().toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <SiSolana className="h-3 w-3" />
                              {getCartTotalSol().toFixed(4)} SOL
                            </p>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleCheckout}
                          data-testid="button-checkout"
                        >
                          Proceed to Checkout
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {checkoutStep === "payment" && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-mono">Payment</DialogTitle>
                  <DialogDescription>
                    Choose your payment method
                  </DialogDescription>
                </DialogHeader>
                <Tabs
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "solana" | "stripe")}
                >
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="solana" className="flex-1" data-testid="tab-solana-pay">
                      <SiSolana className="h-4 w-4 mr-2" />
                      Solana Pay
                    </TabsTrigger>
                    <TabsTrigger value="stripe" className="flex-1" data-testid="tab-stripe">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Card
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="solana" className="space-y-4">
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-mono font-medium">Connect Wallet</p>
                          <p className="text-xs text-muted-foreground">
                            Phantom, Solflare, or any Solana wallet
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white"
                        onClick={handlePaymentSubmit}
                        data-testid="button-connect-wallet"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect & Pay {getCartTotalSol().toFixed(4)} SOL
                      </Button>
                    </Card>
                    <p className="text-xs text-center text-muted-foreground font-mono">
                      (Mock checkout - no real transaction)
                    </p>
                  </TabsContent>

                  <TabsContent value="stripe" className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Card Number
                        </Label>
                        <Input
                          placeholder="4242 4242 4242 4242"
                          className="font-mono"
                          data-testid="input-card-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Expiry
                          </Label>
                          <Input
                            placeholder="MM/YY"
                            className="font-mono"
                            data-testid="input-card-expiry"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            CVC
                          </Label>
                          <Input
                            placeholder="123"
                            className="font-mono"
                            data-testid="input-card-cvc"
                          />
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handlePaymentSubmit}
                        data-testid="button-pay-card"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ${getCartTotal().toFixed(2)}
                      </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground font-mono">
                      (Mock checkout - no real charge)
                    </p>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {checkoutStep === "success" && (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-mono font-bold text-xl mb-2">Order Confirmed!</h3>
                <p className="text-muted-foreground mb-6">
                  Thanks for supporting the Normie Nation. Your merch is on its way!
                </p>
                <Button onClick={closeCheckout} data-testid="button-continue-shopping">
                  Continue Shopping
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
