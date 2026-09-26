// ════════════════════════════════════════════════════════════════
//  "Play Bubble Paws.exe" — the Windows one-click launcher.
//  It simply opens index.html (sitting next to it) in the default web
//  browser, and wears the game icon (icon.ico: Marshmallow & Phoebe in a
//  bubble). Nothing is installed and nothing else is touched.
//
//  Rebuild (any OS with Mono, or Windows with the .NET Framework csc):
//    mcs -target:winexe -win32icon:tools/launcher/icon.ico \
//        -out:"Play Bubble Paws.exe" tools/launcher/Launcher.cs
// ════════════════════════════════════════════════════════════════
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;

[assembly: AssemblyTitle("Play Bubble Paws")]
[assembly: AssemblyDescription("Opens Bubble Paws: The Rainbow Kingdom in your web browser")]
[assembly: AssemblyProduct("Bubble Paws: The Rainbow Kingdom")]
[assembly: AssemblyCompany("Bubble Paws")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

static class BubblePawsLauncher
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    [STAThread]
    static int Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string page = Path.Combine(dir, "index.html");
        if (!File.Exists(page))
        {
            MessageBoxW(IntPtr.Zero,
                "Bubble Paws can't find index.html.\n\nPlease keep \"Play Bubble Paws.exe\" in the game folder, next to index.html.",
                "Bubble Paws", 0x40);
            return 1;
        }
        try
        {
            Process.Start(new ProcessStartInfo(page) { UseShellExecute = true, WorkingDirectory = dir });
            return 0;
        }
        catch (Exception e)
        {
            MessageBoxW(IntPtr.Zero, "Bubble Paws couldn't open your web browser:\n\n" + e.Message + "\n\nYou can also double-click index.html instead.", "Bubble Paws", 0x30);
            return 2;
        }
    }
}
