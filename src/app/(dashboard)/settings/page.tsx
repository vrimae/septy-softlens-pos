"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).single();
      if (!error && data) setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("store_settings").update({
        store_name: settings.store_name,
        address: settings.address,
        phone: settings.phone,
        receipt_footer: settings.receipt_footer
      }).eq("id", settings.id);
      
      if (error) throw error;
      alert("Pengaturan berhasil disimpan.");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Toko</h1>
        <p className="text-sm text-gray-500">Konfigurasi informasi toko dan struk.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil Toko</CardTitle>
          <CardDescription>Informasi ini akan muncul pada struk dan laporan.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Nama Toko</Label>
              <Input 
                id="store_name" 
                required 
                value={settings?.store_name || ""} 
                onChange={e => setSettings({...settings, store_name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input 
                id="phone" 
                value={settings?.phone || ""} 
                onChange={e => setSettings({...settings, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat Toko</Label>
              <Input 
                id="address" 
                value={settings?.address || ""} 
                onChange={e => setSettings({...settings, address: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt_footer">Catatan Kaki Struk</Label>
              <Input 
                id="receipt_footer" 
                value={settings?.receipt_footer || ""} 
                onChange={e => setSettings({...settings, receipt_footer: e.target.value})} 
              />
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
