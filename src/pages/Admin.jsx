import React, { useState } from 'react';
import { Song } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Music, KeyRound, CheckCircle } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

const ADMIN_PASSWORD = "musica"; // Mot de passe simple

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [songData, setSongData] = useState({
        tiktok_url: '',
        title: '',
        artist: '',
        release_date: new Date(),
        description: '',
        lyrics: '',
        spotify_url: '',
        apple_music_url: '',
        youtube_url: '',
        cover_image: '',
        tiktok_video_id: '',
        tiktok_embed_id: '',
        hashtags: []
    });

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Mot de passe incorrect.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');

        try {
            // Pour l'instant, on simule l'ajout
            console.log('Données de la chanson:', songData);
            setSuccessMessage(`La chanson "${songData.title}" a été ajoutée avec succès ! (Mode démo)`);
            
            // Reset form
            setSongData({
                tiktok_url: '', title: '', artist: '', release_date: new Date(),
                description: '', lyrics: '', spotify_url: '', apple_music_url: '',
                youtube_url: '', cover_image: '', tiktok_video_id: '', tiktok_embed_id: '', hashtags: []
            });

        } catch (err) {
            console.error(err);
            alert("Une erreur s'est produite lors de l'ajout de la chanson.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound/> Accès Back-Office</CardTitle>
                        <CardDescription>Veuillez entrer le mot de passe pour continuer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full">Entrer</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <Music className="mx-auto h-12 w-12 text-teal-500" />
                    <h1 className="text-3xl font-bold text-gray-800 mt-4">Back-Office</h1>
                    <p className="text-gray-500">Ajouter une nouvelle chanson de la semaine</p>
                </div>
                
                {successMessage && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 flex items-center gap-3">
                        <CheckCircle />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>1. Informations TikTok</CardTitle>
                            <CardDescription>Entrez les informations de la vidéo TikTok.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="tiktok_url">URL TikTok</Label>
                                <Input 
                                    id="tiktok_url"
                                    placeholder="https://www.tiktok.com/@user/video/123..."
                                    value={songData.tiktok_url}
                                    onChange={(e) => setSongData({...songData, tiktok_url: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="tiktok_video_id">ID Vidéo TikTok</Label>
                                    <Input 
                                        id="tiktok_video_id"
                                        placeholder="1234567890"
                                        value={songData.tiktok_video_id} 
                                        onChange={(e) => setSongData({...songData, tiktok_video_id: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="tiktok_embed_id">ID Embed TikTok</Label>
                                    <Input 
                                        id="tiktok_embed_id"
                                        placeholder="1234567890"
                                        value={songData.tiktok_embed_id} 
                                        onChange={(e) => setSongData({...songData, tiktok_embed_id: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>2. Détails de la chanson</CardTitle>
                            <CardDescription>Complétez les informations de la chanson.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="title">Titre</Label>
                                    <Input id="title" value={songData.title} onChange={(e) => setSongData({...songData, title: e.target.value})} />
                                </div>
                                <div>
                                    <Label htmlFor="artist">Artiste</Label>
                                    <Input id="artist" value={songData.artist} onChange={(e) => setSongData({...songData, artist: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label>Date de sortie (Lundi)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {songData.release_date ? format(songData.release_date, 'PPP', { locale: ptBR }) : <span>Choisissez une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={songData.release_date} onSelect={(date) => setSongData({...songData, release_date: date})} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" placeholder="Une courte histoire sur la chanson..." value={songData.description} onChange={(e) => setSongData({...songData, description: e.target.value})} />
                            </div>
                            <div>
                                <Label htmlFor="lyrics">Paroles</Label>
                                <Textarea id="lyrics" placeholder="Paroles complètes de la chanson..." value={songData.lyrics} onChange={(e) => setSongData({...songData, lyrics: e.target.value})} className="h-32" />
                            </div>
                             <div>
                                <Label htmlFor="cover_image">URL de l'image de couverture</Label>
                                <Input id="cover_image" value={songData.cover_image} onChange={(e) => setSongData({...songData, cover_image: e.target.value})} />
                            </div>
                             <div className="space-y-2">
                                <Label>Liens de streaming</Label>
                                <Input placeholder="Lien Spotify" value={songData.spotify_url} onChange={(e) => setSongData({...songData, spotify_url: e.target.value})} />
                                <Input placeholder="Lien Apple Music" value={songData.apple_music_url} onChange={(e) => setSongData({...songData, apple_music_url: e.target.value})} />
                                <Input placeholder="Lien YouTube" value={songData.youtube_url} onChange={(e) => setSongData({...songData, youtube_url: e.target.value})} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Ajouter la chanson"}
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    );
}