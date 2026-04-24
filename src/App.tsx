/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  ClipboardList,
  DollarSign,
  ArrowLeft,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Check,
  Download,
  Trash2,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Hammer,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Customer,
  Order,
  PendingOrder,
  FinancialRecord,
  ImageAsset,
} from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "chats" | "pending" | "finance" | "gallery"
  >("chats");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [galleryImages, setGalleryImages] = useState<ImageAsset[]>([]);
  const [gallerySearch, setGallerySearch] = useState("");

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [newOrder, setNewOrder] = useState({
    productName: "",
    mStatus: "Pending",
    amount: "",
    paidAmount: "0",
    isReference: false,
    deliveryDate: "",
    description: "",
  });
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const getUrgency = (deliveryDate: string | null) => {
    if (!deliveryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);

    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "Critical";
    if (diffDays <= 2) return "Urgent";
    return "Normal";
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchOrders(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (activeTab === "pending") fetchPending();
    if (activeTab === "finance") fetchFinancials();
    if (activeTab === "gallery") fetchGallery();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "gallery") {
      const delayDebounceFn = setTimeout(() => {
        fetchGallery(gallerySearch);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [gallerySearch]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orders]);

  const fetchCustomers = async (query: string = "") => {
    const endpoint = query
      ? `/api/customers?q=${encodeURIComponent(query)}`
      : "/api/customers";
    const res = await fetch(endpoint);
    const data = await res.json();
    setCustomers(data);
  };

  const fetchGallery = async (search: string = "") => {
    const endpoint = search
      ? `/api/search/images?q=${encodeURIComponent(search)}`
      : "/api/images";
    const res = await fetch(endpoint);
    const data = await res.json();
    setGalleryImages(data);
  };

  const fetchOrders = async (id: number) => {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    setOrders(data);
  };

  const fetchPending = async () => {
    const res = await fetch("/api/reports/pending");
    const data = await res.json();
    setPendingOrders(data);
  };

  const fetchFinancials = async () => {
    const res = await fetch("/api/reports/financials");
    const data = await res.json();
    setFinancials(data);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) return;
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    setNewCustomer({ name: "", phone: "" });
    setShowAddCustomer(false);
    fetchCustomers();
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newOrder.productName) return;

    const formData = new FormData();
    formData.append("customerId", selectedCustomer.id.toString());
    formData.append("productName", newOrder.productName);
    formData.append("mStatus", newOrder.mStatus);
    formData.append("amount", newOrder.amount);
    formData.append("paidAmount", newOrder.paidAmount);
    formData.append("isReference", newOrder.isReference.toString());
    formData.append("deliveryDate", newOrder.deliveryDate);
    formData.append("description", newOrder.description);

    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("photos", selectedFiles[i]);
      }
    }

    await fetch("/api/orders", {
      method: "POST",
      body: formData,
    });

    setNewOrder({
      productName: "",
      mStatus: "Pending",
      amount: "",
      paidAmount: "0",
      isReference: false,
      deliveryDate: "",
      description: "",
    });
    setSelectedFiles(null);
    setShowAddOrder(false);
    fetchOrders(selectedCustomer.id);
    fetchCustomers();
  };

  const deleteImage = async (id: number) => {
    console.log(`[FRONTEND] Requested delete for image ID: ${id}`);
    if (
      window.confirm(
        "Are you sure you want to delete this image? This action cannot be undone.",
      )
    ) {
      try {
        const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete image");
        console.log(`[FRONTEND] Image ${id} deleted successfully`);
        fetchGallery(gallerySearch);
      } catch (error) {
        console.error("[FRONTEND] Error deleting image:", error);
        alert("Failed to delete image. Please try again.");
      }
    }
  };

  const deleteCustomer = async (id: number) => {
    console.log(`[FRONTEND] Requested delete for customer ID: ${id}`);
    if (
      window.confirm(
        "Delete this customer and their orders? (Images will be preserved)",
      )
    ) {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete customer");
        console.log(`[FRONTEND] Customer ${id} deleted successfully`);
        if (selectedCustomer?.id === id) setSelectedCustomer(null);
        fetchCustomers();
      } catch (error) {
        console.error("[FRONTEND] Error deleting customer:", error);
        alert("Failed to delete customer. Please try again.");
      }
    }
  };

  const deleteOrder = async (id: number) => {
    console.log(`[FRONTEND] Requested delete for order ID: ${id}`);
    if (
      window.confirm("Delete this order record? (Images will be preserved)")
    ) {
      try {
        const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete order");
        console.log(`[FRONTEND] Order ${id} deleted successfully`);
        if (selectedCustomer) fetchOrders(selectedCustomer.id);
        fetchCustomers();
        if (activeTab === "pending") fetchPending();
      } catch (error) {
        console.error("[FRONTEND] Error deleting order:", error);
        alert("Failed to delete order. Please try again.");
      }
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    await fetch(`/api/orders/${editingOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: editingOrder.custom_name,
        mStatus: editingOrder.manufacturing_status,
        amount: editingOrder.total_amount,
        paidAmount: editingOrder.paid_amount,
        deliveryDate: editingOrder.delivery_date,
        description: editingOrder.description,
      }),
    });

    setEditingOrder(null);
    if (selectedCustomer) fetchOrders(selectedCustomer.id);
    fetchCustomers();
    if (activeTab === "pending") fetchPending();
  };

  const exportFullBackup = () => {
    window.location.href = "/api/backup/full";
  };

  const toggleOrderExpand = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const next = new Set(expandedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrders(next);
  };

  const filteredCustomers = customers;

  return (
    <div className="flex h-screen bg-[#f0f2f5] text-[#111b21] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[30%] min-w-[350px] bg-white border-r border-[#d1d7db] flex flex-col">
        <header className="bg-white/80 backdrop-blur-md px-4 py-3 flex justify-between items-center h-16 border-b border-[#f0f2f5] sticky top-0 z-20">
          <div className="w-10 h-10 bg-gradient-to-br from-[#25d366] to-[#075e54] rounded-xl flex items-center justify-center shadow-sm">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <div className="flex gap-2 text-[#54656f]">
            <button
              onClick={() => setActiveTab("gallery")}
              title="Gallery"
              className={`p-2.5 rounded-xl transition-all duration-200 hover:bg-[#f0f2f5] active:scale-95 ${activeTab === "gallery" ? "bg-[#f0f2f5] text-[#25d366]" : ""}`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              title="Pending Orders"
              className={`p-2.5 rounded-xl transition-all duration-200 hover:bg-[#f0f2f5] active:scale-95 ${activeTab === "pending" ? "bg-[#f0f2f5] text-[#25d366]" : ""}`}
            >
              <ClipboardList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab("finance")}
              title="Financials"
              className={`p-2.5 rounded-xl transition-all duration-200 hover:bg-[#f0f2f5] active:scale-95 ${activeTab === "finance" ? "bg-[#f0f2f5] text-[#25d366]" : ""}`}
            >
              <DollarSign className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddCustomer(true)}
              title="New Customer"
              className="p-2.5 rounded-xl transition-all duration-200 hover:bg-[#f0f2f5] active:scale-95 text-[#25d366]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="p-3">
          <div className="bg-[#f0f2f5] flex items-center px-4 py-2 rounded-xl transition-all border border-transparent focus-within:border-[#25d366]/20 focus-within:bg-white focus-within:shadow-sm">
            <Search className="w-4 h-4 text-[#8696a0] mr-4" />
            <input
              type="text"
              placeholder="Search customers..."
              className="bg-transparent border-none outline-none flex-1 text-[15px] py-0.5 placeholder:text-[#8696a0]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          {filteredCustomers.map((customer) => (
            <motion.div
              layout
              key={customer.id}
              onClick={() => {
                setSelectedCustomer(customer);
                setActiveTab("chats");
              }}
              className={`group flex items-center px-4 py-3 cursor-pointer rounded-2xl mb-1 transition-all ${
                selectedCustomer?.id === customer.id
                  ? "bg-[#f0f2f5] shadow-sm"
                  : "hover:bg-[#f9fafa]"
              }`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#f0f2f5] to-[#dfe5e7] rounded-full flex items-center justify-center mr-4 shrink-0 shadow-inner">
                <span className="text-[#54656f] text-lg font-semibold">
                  {customer.name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-semibold truncate text-[16px] text-[#111b21]">
                    {customer.name}
                  </h3>
                </div>
                <p className="text-[13px] text-[#667781] truncate leading-tight">
                  {customer.last_order || "No orders yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCustomer(customer.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1.5 hover:bg-white rounded-lg"
                  title="Delete Customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
        {/* Background Overlay Pattern (WhatsApp vibe) */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url('https://branditechture.agency/brand-logos/wp-content/uploads/2022/10/WhatsApp-Pattern.png')",
            backgroundSize: "400px",
          }}
        />

        {activeTab === "chats" ? (
          selectedCustomer ? (
            <>
              {/* Chat Header */}
              <header className="bg-white/90 backdrop-blur-md px-6 py-2 flex justify-between items-center z-20 border-l border-[#d1d7db] h-16 shadow-sm sticky top-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#dfe5e7] to-[#d1d7db] rounded-full flex items-center justify-center mr-4 shadow-inner">
                    <span className="text-[#54656f] font-bold">
                      {selectedCustomer.name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-[#111b21]">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-[12px] text-[#667781] font-medium">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 text-[#54656f]">
                  <button
                    onClick={exportFullBackup}
                    title="Full System Backup"
                    className="p-2 hover:bg-[#f0f2f5] rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-[#f0f2f5] rounded-xl transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Chat Window */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 flex flex-col gap-6 z-10 relative scrollbar-thin overscroll-contain">
                {orders.map((order) => {
                  const urgency = getUrgency(order.delivery_date);
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setEditingOrder(order)}
                      className={`max-w-[95%] md:max-w-[85%] group self-start cursor-pointer transition-all duration-300`}
                    >
                      <div
                        className={`bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden border transition-all duration-300 ${
                          urgency === "Critical"
                            ? "border-red-200 ring-4 ring-red-50/50"
                            : urgency === "Urgent"
                              ? "border-orange-200 ring-4 ring-orange-50/50"
                              : "border-transparent hover:border-[#25d366]/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3 gap-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#111b21] text-[17px] leading-tight mb-1">
                                {order.custom_name}
                              </span>
                              {order.delivery_date && (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                      urgency === "Critical"
                                        ? "bg-red-500"
                                        : urgency === "Urgent"
                                          ? "bg-orange-500"
                                          : "bg-blue-400"
                                    }`}
                                  />
                                  <span
                                    className={`text-[11px] font-bold uppercase tracking-wider ${
                                      urgency === "Critical"
                                        ? "text-red-600"
                                        : urgency === "Urgent"
                                          ? "text-orange-600"
                                          : "text-[#667781]"
                                    }`}
                                  >
                                    Due:{" "}
                                    {new Date(
                                      order.delivery_date,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOrder(order.id);
                              }}
                              className="text-[#667781] hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all opacity-60 hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Description Preview / View Details */}
                          {order.description && (
                            <div className="mb-4 bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]/50">
                              <p
                                className={`text-[13px] text-[#475569] leading-relaxed line-clamp-3`}
                              >
                                {order.description}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="flex items-center gap-1.5 bg-[#f8fafc] px-2.5 py-1.5 rounded-xl border border-[#e2e8f0]">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  order.manufacturing_status === "Completed"
                                    ? "bg-green-500"
                                    : order.manufacturing_status === "Prepared"
                                      ? "bg-purple-500"
                                      : order.manufacturing_status ===
                                          "In Progress"
                                        ? "bg-blue-500"
                                        : "bg-gray-400"
                                }`}
                              />
                              <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wide">
                                {order.manufacturing_status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-[#f8fafc] px-2.5 py-1.5 rounded-xl border border-[#e2e8f0]">
                              <span
                                className={`text-[12px] font-bold uppercase tracking-wide ${
                                  order.payment_status === "Paid"
                                    ? "text-green-600"
                                    : order.payment_status === "Partial"
                                      ? "text-purple-600"
                                      : "text-red-500"
                                }`}
                              >
                                {order.payment_status}
                              </span>
                            </div>

                            <div className="ml-auto text-[15px] font-bold">
                              <span className="text-[#111b21]">
                                ₹{order.paid_amount.toLocaleString()}
                              </span>
                              <span className="text-[#94a3b8] font-medium mx-1">
                                /
                              </span>
                              <span className="text-[#64748b] font-medium">
                                ₹{order.total_amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {order.order_images && (
                            <div className="mb-4">
                              <p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-widest mb-2 px-1">
                                Order Gallery
                              </p>
                              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
                                {order.order_images.split(",").map((img, i) => (
                                  <div
                                    key={i}
                                    className="relative shrink-0 snap-start"
                                  >
                                    <img
                                      src={`/uploads/${img}`}
                                      alt={order.custom_name}
                                      className="w-28 h-28 object-cover rounded-xl border border-[#e2e8f0] shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in"
                                      referrerPolicy="no-referrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                          `/uploads/${img}`,
                                          "_blank",
                                        );
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {order.reference_images && (
                            <div className="mb-2">
                              <p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-widest mb-2 px-1">
                                Reference Material
                              </p>
                              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
                                {order.reference_images
                                  .split(",")
                                  .map((img, i) => (
                                    <div
                                      key={i}
                                      className="relative shrink-0 snap-start"
                                    >
                                      <img
                                        src={`/uploads/${img}`}
                                        alt="reference"
                                        className="w-20 h-20 object-cover rounded-xl opacity-60 hover:opacity-100 transition-all border border-[#e2e8f0] shadow-sm cursor-zoom-in"
                                        referrerPolicy="no-referrer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(
                                            `/uploads/${img}`,
                                            "_blank",
                                          );
                                        }}
                                      />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          <div className="text-[11px] text-[#94a3b8] font-medium flex justify-end items-center gap-1.5 mt-2">
                            <span>
                              {new Date(order.created_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                            {order.manufacturing_status === "Completed" ? (
                              <div className="flex -space-x-1">
                                <Check className="w-3.5 h-3.5 text-[#25d366]" />
                                <Check className="w-3.5 h-3.5 text-[#25d366]" />
                              </div>
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#94a3b8]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Floating Action Button (FAB) for New Order */}
              <button
                onClick={() => setShowAddOrder(true)}
                className="fixed bottom-24 right-8 w-14 h-14 bg-[#25d366] text-white rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 hover:bg-[#1fb356] transition-all z-20 md:hidden"
              >
                <Plus className="w-8 h-8" />
              </button>

              {/* Chat Input Area */}
              <div className="bg-white/80 backdrop-blur-md p-4 flex items-center gap-4 z-20 border-l border-[#d1d7db]">
                <div
                  onClick={() => setShowAddOrder(true)}
                  className="flex-1 bg-[#f0f2f5] rounded-2xl px-5 py-3 text-[#54656f] text-[15px] cursor-text hover:bg-white border border-transparent hover:border-[#25d366]/20 hover:shadow-sm flex justify-between items-center transition-all group"
                >
                  <span className="group-hover:text-[#111b21]">
                    Add a new order record...
                  </span>
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-[#8696a0]" />
                    <Send className="w-5 h-5 text-[#8696a0]" />
                  </div>
                </div>
                <button
                  onClick={() => setShowAddOrder(true)}
                  className="hidden md:flex p-3.5 bg-[#25d366] text-white rounded-2xl hover:bg-[#1fb356] shadow-md shadow-[#25d366]/20 transition-all active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 z-10">
              <div className="w-64 h-64 bg-gray-200 rounded-full mb-8 flex items-center justify-center animate-pulse">
                <MessageSquare className="w-32 h-32 text-gray-300" />
              </div>
              <h2 className="text-[32px] font-light text-[#41525d] mb-4">
                Workshop Tracker
              </h2>
              <p className="text-[#667781] max-w-md text-[14px] leading-relaxed">
                Select a customer from the left to view their order timeline or
                start tracking new builds.
              </p>
              <div className="mt-20 text-[13px] text-[#8696a0] border-t border-[#d1d7db] pt-6 flex items-center gap-2">
                <span>Fully offline local storage powered by SQLite</span>
              </div>
            </div>
          )
        ) : activeTab === "gallery" ? (
          <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#f8fafc]">
            <header className="bg-white/90 backdrop-blur-md px-6 py-4 flex items-center gap-6 h-16 border-l border-[#d1d7db] shadow-sm sticky top-0 z-20">
              <button
                onClick={() => setActiveTab("chats")}
                className="p-2 hover:bg-[#f0f2f5] rounded-xl transition-colors text-[#54656f]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[18px] font-bold text-[#111b21]">
                Workshop Gallery
              </h2>
              <div className="bg-[#f0f2f5] flex items-center px-4 py-2 rounded-xl transition-all border border-transparent focus-within:border-[#25d366]/20 focus-within:bg-white focus-within:shadow-sm ml-auto w-64 md:w-80">
                <Search className="w-4 h-4 text-[#8696a0] mr-3" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="bg-transparent border-none outline-none flex-1 text-[14px] py-0.5 placeholder:text-[#8696a0]"
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {galleryImages.map((img) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={img.id}
                    className="group relative bg-white rounded-2xl overflow-hidden aspect-square shadow-sm border border-transparent hover:border-[#25d366]/30 hover:shadow-xl transition-all duration-500"
                  >
                    <img
                      src={`/uploads/${img.file_path}`}
                      className="w-full h-full object-cover cursor-zoom-in group-hover:scale-110 transition-transform duration-700"
                      onClick={() =>
                        window.open(`/uploads/${img.file_path}`, "_blank")
                      }
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-[12px] font-bold truncate uppercase tracking-wide">
                        {img.product_name}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-xl scale-0 group-hover:scale-100 transition-transform hover:bg-red-600 shadow-xl backdrop-blur-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
              {galleryImages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[#8696a0] py-20">
                  <div className="w-20 h-20 bg-[#f0f2f5] rounded-3xl flex items-center justify-center mb-6">
                    <ImageIcon className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="font-semibold text-lg">No images in gallery</p>
                  <p className="text-sm opacity-70">
                    New images will appear here as you add orders.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "pending" ? (
          <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#f8fafc]">
            <header className="bg-white/90 backdrop-blur-md px-6 py-4 flex items-center gap-6 h-16 border-l border-[#d1d7db] shadow-sm sticky top-0 z-20">
              <button
                onClick={() => setActiveTab("chats")}
                className="p-2 hover:bg-[#f0f2f5] rounded-xl transition-colors text-[#54656f]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[18px] font-bold text-[#111b21]">
                Queued Orders
              </h2>
            </header>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 space-y-4 md:space-y-6 scrollbar-thin">
              {pendingOrders.map((order) => {
                const urgency = getUrgency(order.delivery_date);
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={order.id}
                    onClick={() => {
                      const cust = customers.find(
                        (c) => c.id === order.customer_id,
                      );
                      if (cust) {
                        setSelectedCustomer(cust);
                        setActiveTab("chats");
                      }
                    }}
                    className={`bg-white p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                      urgency === "Critical"
                        ? "border-red-200 bg-red-50/10"
                        : urgency === "Urgent"
                          ? "border-orange-200 bg-orange-50/10"
                          : "border-[#f1f5f9]"
                    }`}
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#e2e8f0] shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {order.preview_image ? (
                        <img
                          src={`/uploads/${order.preview_image}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-[#111b21] text-[17px] mb-0.5 truncate">
                            {order.custom_name}
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[10px] font-bold">
                              {order.customer_name[0]}
                            </div>
                            <p className="text-[13px] font-medium text-[#64748b] truncate">
                              {order.customer_name}
                            </p>
                          </div>
                        </div>
                        {order.delivery_date && (
                          <div
                            className={`px-3 py-1.5 rounded-xl border font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 ${
                              urgency === "Critical"
                                ? "bg-red-50 border-red-200 text-red-600"
                                : urgency === "Urgent"
                                  ? "bg-orange-50 border-orange-200 text-orange-600"
                                  : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.delivery_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border shadow-sm ${
                            order.manufacturing_status === "Completed"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          }`}
                        >
                          {order.manufacturing_status}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border shadow-sm ${
                            order.payment_status === "Paid"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-red-50 border-red-200 text-red-600"
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOrder(order.id);
                        }}
                        className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm"
                        title="Delete Order"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button className="hidden md:flex p-3 bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366] hover:text-white rounded-2xl transition-all relative group-hover:scale-110 active:scale-95 shadow-sm">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {pendingOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[#8696a0] py-20 px-10">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    <ClipboardList className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="font-semibold text-lg text-[#111b21]">
                    All clear!
                  </p>
                  <p className="text-sm opacity-70 text-center max-w-xs">
                    You have no pending orders. Every project is accounted for.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#f8fafc]">
            <header className="bg-white/90 backdrop-blur-md px-6 py-4 flex items-center gap-6 h-16 border-l border-[#d1d7db] shadow-sm sticky top-0 z-20">
              <button
                onClick={() => setActiveTab("chats")}
                className="p-2 hover:bg-[#f0f2f5] rounded-xl transition-colors text-[#54656f]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[18px] font-bold text-[#111b21]">
                Economic Insight
              </h2>
              <div className="ml-auto">
                <button
                  onClick={exportFullBackup}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#25d366] to-[#075e54] text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-[13px] shadow-lg shadow-[#25d366]/20"
                >
                  <Download className="w-4 h-4" />
                  Full Export
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto min-h-0 p-6 md:p-10 scrollbar-thin">
              <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-[0_10px_40px_rgba(37,211,102,0.1)] border border-[#25d366]/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#25d366]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[#64748b] text-[13px] uppercase font-bold tracking-widest mb-3">
                    Total Workshop Yield
                  </p>
                  <p className="text-5xl font-black text-[#111b21] tracking-tight">
                    ₹
                    {financials
                      .reduce((sum, f) => sum + f.total, 0)
                      .toLocaleString()}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-bold">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Live calculation</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-[#e2e8f0] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[#64748b] text-[13px] uppercase font-bold tracking-widest mb-3">
                    Total Client Base
                  </p>
                  <p className="text-5xl font-black text-[#111b21] tracking-tight">
                    {customers.length}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[#64748b] text-sm font-bold">
                    <span>{financials.length} clients with orders</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f1f5f9] bg-[#f8fafc]/50">
                  <h3 className="text-[15px] font-black text-[#111b21] uppercase tracking-[0.15em]">
                    Yield per Client
                  </h3>
                </div>
                <div className="divide-y divide-[#f1f5f9]">
                  {financials
                    .sort((a, b) => b.total - a.total)
                    .map((f, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={f.name}
                        className="flex justify-between items-center py-5 px-8 hover:bg-[#f9fafa] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#f0f2f5] rounded-xl flex items-center justify-center font-bold text-[#64748b] transition-colors group-hover:bg-[#25d366]/10 group-hover:text-[#25d366]">
                            {f.name[0]}
                          </div>
                          <span className="font-bold text-[16px] text-[#111b21]">
                            {f.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[18px] text-[#111b21]">
                            ₹{f.total.toLocaleString()}
                          </p>
                          <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mt-0.5">
                            Contribution
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  {financials.length === 0 && (
                    <div className="p-20 text-center text-[#8696a0]">
                      <p>No financial data available yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="bg-gradient-to-br from-[#25d366] to-[#075e54] p-10 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,1),transparent)]" />
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md ring-4 ring-white/10">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  Engage New Client
                </h3>
                <p className="text-white/80 text-sm font-medium">
                  Create a workspace to track their projects
                </p>
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                    Client Title
                  </label>
                  <input
                    type="text"
                    placeholder="Full identity name"
                    className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                    Contact Protocol
                  </label>
                  <input
                    type="text"
                    placeholder="Phone or system ID"
                    className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 py-4 font-black text-[#64748b] hover:bg-[#f1f5f9] rounded-2xl transition-all uppercase tracking-widest text-[12px]"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    className="flex-1 py-4 font-black bg-[#25d366] text-white rounded-2xl shadow-xl shadow-[#25d366]/20 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest text-[12px]"
                  >
                    Initiate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAddOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col"
            >
              <div className="bg-[#111b21] p-6 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25d366]/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-[#25d366] rounded-2xl flex items-center justify-center shadow-lg shadow-[#25d366]/20">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight uppercase">
                        Assemble Architecture
                      </h3>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest">
                        Building for {selectedCustomer?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddOrder(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Plus className="rotate-45 w-6 h-6 text-white/50" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <form
                  onSubmit={handleAddOrder}
                  className="p-6 md:p-8 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Product Designation
                      </label>
                      <input
                        type="text"
                        placeholder="What are we building?"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={newOrder.productName}
                        onChange={(e) =>
                          setNewOrder({
                            ...newOrder,
                            productName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Lifecycle State
                      </label>
                      <select
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold appearance-none cursor-pointer"
                        value={newOrder.mStatus}
                        onChange={(e) =>
                          setNewOrder({ ...newOrder, mStatus: e.target.value })
                        }
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Prepared</option>
                        <option>Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Target Delivery
                      </label>
                      <input
                        type="date"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={newOrder.deliveryDate}
                        onChange={(e) =>
                          setNewOrder({
                            ...newOrder,
                            deliveryDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Full Value (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={newOrder.amount}
                        onChange={(e) =>
                          setNewOrder({ ...newOrder, amount: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Received Yield (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={newOrder.paidAmount}
                        onChange={(e) =>
                          setNewOrder({
                            ...newOrder,
                            paidAmount: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-2 mt-4 pt-4 border-t border-[#f1f5f9]">
                      <h4 className="text-[11px] font-black text-[#111b21] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#25d366]" /> Work
                        Specifications
                      </h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                          Description / Notes
                        </label>
                        <textarea
                          rows={3}
                          placeholder="General notes about the build..."
                          className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold resize-none"
                          value={newOrder.description}
                          onChange={(e) =>
                            setNewOrder({
                              ...newOrder,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Asset Integration
                      </label>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            multiple
                            id="file-upload"
                            className="hidden"
                            onChange={(e) => setSelectedFiles(e.target.files)}
                          />
                          <label
                            htmlFor="file-upload"
                            className={`w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${selectedFiles ? "border-[#25d366] text-[#25d366] bg-[#25d366]/5 shadow-inner" : "border-[#e2e8f0] text-[#64748b] hover:border-[#25d366] hover:bg-[#f1f5f9]"}`}
                          >
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              {selectedFiles
                                ? `${selectedFiles.length} Assets Loaded`
                                : "Load Digital Assets"}
                            </span>
                          </label>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl hover:bg-[#f1f5f9] transition-all border border-transparent hover:border-[#e2e8f0]">
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newOrder.isReference ? "bg-[#25d366] border-[#25d366]" : "border-[#cbd5e1]"}`}
                            >
                              {newOrder.isReference && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={newOrder.isReference}
                              onChange={(e) =>
                                setNewOrder({
                                  ...newOrder,
                                  isReference: e.target.checked,
                                })
                              }
                            />
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-bold text-[#111b21]">
                                Reference Logic
                              </span>
                              <span className="text-[10px] text-[#64748b] font-medium uppercase truncate">
                                Mark as non-unique material
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="w-full py-5 font-black bg-gradient-to-r from-[#25d366] to-[#075e54] text-white rounded-2xl shadow-xl shadow-[#25d366]/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-[13px]"
                    >
                      Execute Record Entry
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col"
            >
              <div className="bg-gradient-to-br from-[#111b21] to-[#1e293b] p-6 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25d366]/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                <div className="relative flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md ring-1 ring-white/20">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight uppercase">
                        Update Manifest
                      </h3>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest">
                        Modifying Object: {editingOrder.custom_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingOrder(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Plus className="rotate-45 w-6 h-6 text-white/50" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <form
                  onSubmit={handleUpdateOrder}
                  className="p-6 md:p-8 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Manifest Designation
                      </label>
                      <input
                        type="text"
                        placeholder="What are we building?"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={editingOrder.custom_name}
                        onChange={(e) =>
                          setEditingOrder({
                            ...editingOrder,
                            custom_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Lifecycle State
                      </label>
                      <select
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold appearance-none cursor-pointer"
                        value={editingOrder.manufacturing_status}
                        onChange={(e) =>
                          setEditingOrder({
                            ...editingOrder,
                            manufacturing_status: e.target.value as any,
                          })
                        }
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Prepared</option>
                        <option>Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Target Delivery
                      </label>
                      <input
                        type="date"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={editingOrder.delivery_date || ""}
                        onChange={(e) =>
                          setEditingOrder({
                            ...editingOrder,
                            delivery_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Full Value (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={editingOrder.total_amount}
                        onChange={(e) =>
                          setEditingOrder({
                            ...editingOrder,
                            total_amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                        Received Yield (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold"
                        value={editingOrder.paid_amount}
                        onChange={(e) =>
                          setEditingOrder({
                            ...editingOrder,
                            paid_amount: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-2 mt-4 pt-4 border-t border-[#f1f5f9]">
                      <h4 className="text-[11px] font-black text-[#111b21] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#25d366]" /> Work
                        Specifications
                      </h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] ml-1">
                          Description / Notes
                        </label>
                        <textarea
                          rows={3}
                          placeholder="General notes about the build..."
                          className="w-full px-6 py-4 bg-[#f1f5f9] rounded-2xl outline-none focus:ring-4 focus:ring-[#25d366]/10 focus:bg-white border border-transparent focus:border-[#25d366]/30 transition-all font-semibold resize-none"
                          value={editingOrder.description || ""}
                          onChange={(e) =>
                            setEditingOrder({
                              ...editingOrder,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        deleteOrder(editingOrder.id);
                        setEditingOrder(null);
                      }}
                      className="flex-1 min-w-full md:min-w-0 py-4 font-black bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-2xl transition-all uppercase tracking-widest text-[11px]"
                    >
                      Delete Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingOrder(null)}
                      className="flex-1 py-4 font-black text-[#64748b] hover:bg-[#f1f5f9] rounded-2xl transition-all uppercase tracking-widest text-[11px]"
                    >
                      Abort Changes
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 font-black bg-gradient-to-r from-[#25d366] to-[#075e54] text-white rounded-2xl shadow-xl shadow-[#25d366]/20 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest text-[11px]"
                    >
                      Commit Updates
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
