"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ShippingInfoPage() {
  // 郵便番号から都道府県・市区郡・住所自動セット
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      const data = await res.json()
      if (data && data.results && data.results.length > 0) {
        const result = data.results[0]
        // Normalize address3: if it starts with address2 (city), remove the duplicate prefix
        let addr3 = result.address3 || "";
        if (result.address2 && addr3.startsWith(result.address2)) {
          addr3 = addr3.slice(result.address2.length).trim();
        }
        setForm(f => ({
          ...f,
          state: result.address1 || f.state,
          city: result.address2 || f.city,
          address: addr3 || f.address
        }))
      }
    } catch {
      // ignore error: 郵便番号API失敗時は何もしない
    }
  }
  // 先頭のuseEffect（DBユーザー情報取得）を削除
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    name: session?.user?.name || "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
    state: "",
    email: session?.user?.email || ""
  });
  // DBユーザー情報取得（useSession宣言より後に記述）
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch("/api/user")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setForm(f => ({
            ...f,
            name: f.name || data.name || "",
            phone: f.phone || data.phone || "",
            address: f.address || data.address || "",
            postalCode: f.postalCode || data.postalCode || "",
            state: f.state || data.state || "",
            city: f.city || data.city || "",
            email: f.email || data.email || ""
          }))
        }
      })
      .catch(() => {})
  }, [status, session])
  const [deliveryService, setDeliveryService] = useState("japanpost");
  const [shippingFee, setShippingFee] = useState(800);
  // ログイン必須ガード
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/shop/auth/signin?returnTo=/shop/shipping");
    }
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // 郵便番号が7桁数字なら自動住所セット
    if (name === "postalCode" && /^[0-9]{7}$/.test(value)) {
      fetchAddressFromPostalCode(value);
    }
  };
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryService(e.target.value);
    setShippingFee(e.target.value === "yamato" ? 900 : 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 配送先情報＋配送方法＋配送料をCheckout画面に渡して遷移
    const params = new URLSearchParams({
      ...form,
      deliveryService,
      shippingFee: shippingFee.toString()
    }).toString();
    router.push(`/shop/checkout?${params}`);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">配送情報の入力</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
          <input name="name" id="name" value={form.name} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
          <input name="phone" id="phone" value={form.phone} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input name="email" id="email" value={form.email} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
          <input name="postalCode" id="postalCode" value={form.postalCode} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
          <input name="state" id="state" value={form.state} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">市区郡</label>
          <input name="city" id="city" value={form.city} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">住所</label>
          <input name="address" id="address" value={form.address} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div className="mt-4">
          <label className="block font-medium mb-2">配送方法</label>
          <div className="flex gap-4">
            <label>
              <input type="radio" name="deliveryService" value="japanpost" checked={deliveryService === "japanpost"} onChange={handleServiceChange} /> 日本郵便（¥800）
            </label>
            <label>
              <input type="radio" name="deliveryService" value="yamato" checked={deliveryService === "yamato"} onChange={handleServiceChange} /> ヤマト（¥900）
            </label>
          </div>
          <div className="mt-2 text-sm text-gray-700">配送料: <span className="font-bold">¥{shippingFee}</span></div>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">次へ（決済画面へ）</button>
      </form>
    </div>
  );
}
