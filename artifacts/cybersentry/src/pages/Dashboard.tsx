import React from 'react';
import { DisclaimerGate } from '../components/DisclaimerGate';
import { Header } from '../components/Header';
import { StatusWidget } from '../components/StatusWidget';
import { PhoneCheck } from '../components/PhoneCheck';
import { EmailScan } from '../components/EmailScan';
import { SecurityLog } from '../components/SecurityLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Activity } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans">
      <DisclaimerGate />
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
        <StatusWidget />
        
        <Tabs defaultValue="phone" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 border border-border/50 h-auto p-1 rounded-lg">
            <TabsTrigger 
              value="phone" 
              className="font-mono py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
            >
              <Phone className="w-4 h-4 hidden sm:block" />
              Проверка номера
            </TabsTrigger>
            <TabsTrigger 
              value="email" 
              className="font-mono py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
            >
              <Mail className="w-4 h-4 hidden sm:block" />
              Сканер утечек
            </TabsTrigger>
            <TabsTrigger 
              value="log" 
              className="font-mono py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all gap-2"
            >
              <Activity className="w-4 h-4 hidden sm:block" />
              События защиты
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-8">
            <TabsContent value="phone" className="m-0 border-none outline-none">
              <PhoneCheck />
            </TabsContent>
            
            <TabsContent value="email" className="m-0 border-none outline-none">
              <EmailScan />
            </TabsContent>
            
            <TabsContent value="log" className="m-0 border-none outline-none">
              <SecurityLog />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
