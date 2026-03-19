let express = require("express");
let router = express.Router();
let inventoryModel = require("../schemas/inventory");
let productModel = require("../schemas/products");

function normalizeQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getSoldCount(inventory) {
  if (typeof inventory.soldCount === "number") {
    return inventory.soldCount;
  }
  if (typeof inventory.souldCount === "number") {
    return inventory.souldCount;
  }
  return 0;
}

function buildInventoryResponse(inventory, product) {
  return {
    _id: inventory._id,
    product: inventory.product,
    productName: product.title,
    stock: inventory.stock,
    reserved: inventory.reserved,
    soldCount: getSoldCount(inventory),
    createdAt: inventory.createdAt,
    updatedAt: inventory.updatedAt,
  };
}

// Get all inventory with product details
router.get("/", async function (req, res) {
  try {
    let inventories = await inventoryModel
      .find()
      .populate({
        path: "product",
        select: "title price description category images",
      })
      .populate({
        path: "product",
        populate: {
          path: "category",
          select: "name",
        },
      });
    res.send(inventories);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get inventory by ID with product details
router.get("/:id", async function (req, res) {
  try {
    let id = req.params.id;
    let inventory = await inventoryModel
      .findById(id)
      .populate({
        path: "product",
        select: "title price description category images",
      })
      .populate({
        path: "product",
        populate: {
          path: "category",
          select: "name",
        },
      });

    if (inventory) {
      res.send(inventory);
    } else {
      res.status(404).send({ message: "Khong tim thay gio hang" });
    }
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
});

// Add stock
router.post("/:productId/add-stock", async function (req, res) {
  try {
    let productId = req.params.productId;
    let quantity = normalizeQuantity(req.body.quantity);

    if (!quantity) {
      return res.status(400).send({ message: "Quantity phai la so > 0" });
    }

    // Check if product exists
    let product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).send({ message: "San pham khong ton tai" });
    }

    // Find inventory by product ID
    let inventory = await inventoryModel.findOne({ product: productId });

    if (inventory) {
      // Update existing inventory
      inventory.stock += quantity;
      await inventory.save();
    } else {
      // Create new inventory record
      inventory = new inventoryModel({
        product: productId,
        stock: quantity,
        reserved: 0,
        soldCount: 0,
        souldCount: 0,
      });
      await inventory.save();
    }

    res.send(buildInventoryResponse(inventory, product));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// remove stock
router.post("/:productId/remove-stock", async function (req, res) {
  try {
    let productId = req.params.productId;
    let quantity = normalizeQuantity(req.body.quantity);

    if (!quantity) {
      return res.status(400).send({ message: "Quantity phai la so > 0" });
    }

    // Check if product exists
    let product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).send({ message: "San pham khong ton tai" });
    }

    // Find inventory by product ID
    let inventory = await inventoryModel.findOne({ product: productId });

    if (!inventory) {
      return res.status(404).send({ message: "Gio hang khong ton tai" });
    }

    if (inventory.stock < quantity) {
      return res.status(400).send({ message: "So luong trong kho khong du" });
    }

    inventory.stock -= quantity;
    await inventory.save();

    res.send(buildInventoryResponse(inventory, product));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// reservation: giam stock, tang reserved
router.post("/reservation", async function (req, res) {
  try {
    let { product, quantity } = req.body;
    quantity = normalizeQuantity(quantity);

    if (!product) {
      return res.status(400).send({ message: "Thieu product" });
    }

    if (!quantity) {
      return res.status(400).send({ message: "Quantity phai la so > 0" });
    }

    let existingProduct = await productModel.findById(product);
    if (!existingProduct) {
      return res.status(404).send({ message: "San pham khong ton tai" });
    }

    let inventory = await inventoryModel.findOne({ product: product });
    if (!inventory) {
      return res.status(404).send({ message: "Gio hang khong ton tai" });
    }

    if (inventory.stock < quantity) {
      return res.status(400).send({ message: "So luong trong kho khong du" });
    }

    inventory.stock -= quantity;
    inventory.reserved += quantity;
    await inventory.save();

    res.send(buildInventoryResponse(inventory, existingProduct));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// sold: giam reserved, tang soldCount
router.post("/sold", async function (req, res) {
  try {
    let { product, quantity } = req.body;
    quantity = normalizeQuantity(quantity);

    if (!product) {
      return res.status(400).send({ message: "Thieu product" });
    }

    if (!quantity) {
      return res.status(400).send({ message: "Quantity phai la so > 0" });
    }

    let existingProduct = await productModel.findById(product);
    if (!existingProduct) {
      return res.status(404).send({ message: "San pham khong ton tai" });
    }

    let inventory = await inventoryModel.findOne({ product: product });
    if (!inventory) {
      return res.status(404).send({ message: "Gio hang khong ton tai" });
    }

    if (inventory.reserved < quantity) {
      return res.status(400).send({ message: "Reserved khong du" });
    }

    inventory.reserved -= quantity;
    inventory.soldCount = getSoldCount(inventory) + quantity;
    inventory.souldCount = inventory.soldCount;
    await inventory.save();

    res.send(buildInventoryResponse(inventory, existingProduct));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
