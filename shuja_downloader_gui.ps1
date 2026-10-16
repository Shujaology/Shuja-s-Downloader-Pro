<#
.SYNOPSIS
    Shuja Download Manager Pro v2.0 - Modern WPF / XAML GUI
.DESCRIPTION
    Native Windows Presentation Foundation (WPF) GUI for the high-performance
    multi-threaded PowerShell download manager. Features a Fluent dark-mode UI,
    live per-chunk visualization grid, real-time speed & ETA metrics, Pause/Resume/Cancel
    controls, directory selector, clipboard paste, live terminal log, and SHA-256 checksums.
#>

[CmdletBinding()]
param ()

# Ensure STA ApartmentState required for WPF
if ([System.Threading.Thread]::CurrentThread.GetApartmentState() -ne [System.Threading.ApartmentState]::STA) {
    Write-Host "[*] Relaunching in Single-Threaded Apartment (STA) mode for WPF..." -ForegroundColor Cyan
    $proc = Start-Process powershell.exe -ArgumentList "-STA -ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -PassThru
    exit
}

# Load WPF and Forms Assemblies
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Drawing, System.Windows.Forms, System.Net.Http

# Set high-speed network protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
[Net.ServicePointManager]::DefaultConnectionLimit = 64

# -----------------------------------------------------------------------------
# XAML Interface Definition
# -----------------------------------------------------------------------------
$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Shuja Download Manager Pro"
        Height="760" Width="980" MinHeight="620" MinWidth="820"
        WindowStartupLocation="CenterScreen"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent">

    <Window.Resources>
        <!-- Custom ScrollBar Styling -->
        <Style TargetType="{x:Type ScrollViewer}">
            <Setter Property="PanningMode" Value="Both"/>
        </Style>

        <!-- Modern Button Style -->
        <Style x:Key="ModernBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#F8FAFC"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="14,8"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="border" CornerRadius="6" Background="{TemplateBinding Background}" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Opacity" Value="0.88"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Opacity" Value="0.75"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Opacity" Value="0.38"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <!-- Gradient Progress Bar Style -->
        <Style x:Key="GradientProgress" TargetType="ProgressBar">
            <Setter Property="Foreground">
                <Setter.Value>
                    <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
                        <GradientStop Color="#06B6D4" Offset="0.0"/>
                        <GradientStop Color="#3B82F6" Offset="0.5"/>
                        <GradientStop Color="#8B5CF6" Offset="1.0"/>
                    </LinearGradientBrush>
                </Setter.Value>
            </Setter>
            <Setter Property="Background" Value="#1E293B"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Height" Value="14"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ProgressBar">
                        <Grid x:Name="TemplateRoot">
                            <Border CornerRadius="7" Background="{TemplateBinding Background}"/>
                            <Border x:Name="PART_Indicator" CornerRadius="7" Background="{TemplateBinding Foreground}" HorizontalAlignment="Left"/>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <!-- Outer Main Border with Drop Shadow -->
    <Border CornerRadius="12" Background="#0B132B" BorderBrush="#1E293B" BorderThickness="1.5">
        <Border.Effect>
            <DropShadowEffect Color="#000000" BlurRadius="28" Opacity="0.65" ShadowDepth="4"/>
        </Border.Effect>

        <Grid>
            <Grid.RowDefinitions>
                <RowDefinition Height="46"/>   <!-- Custom Title Bar -->
                <RowDefinition Height="Auto"/> <!-- Input & Settings Panel -->
                <RowDefinition Height="*"/>    <!-- Visualizer & Chunk Grid -->
                <RowDefinition Height="Auto"/> <!-- Action Bar (Pause, Resume, Cancel) -->
                <RowDefinition Height="Auto"/> <!-- Expandable Terminal Console -->
                <RowDefinition Height="32"/>   <!-- Footer Status Bar -->
            </Grid.RowDefinitions>

            <!-- 1. CUSTOM TOP TITLE BAR -->
            <Border Grid.Row="0" Name="TitleBar" Background="#111B38" CornerRadius="12,12,0,0" Padding="14,0">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="Auto"/>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                        <Border Background="#3B82F6" CornerRadius="6" Width="26" Height="26" Margin="0,0,10,0">
                            <TextBlock FontSize="14" FontWeight="Bold" Foreground="White" HorizontalAlignment="Center" Text="S" VerticalAlignment="Center"/>
                        </Border>
                        <TextBlock Text="SHUJA DOWNLOAD MANAGER PRO" FontSize="13" FontWeight="Bold" Foreground="#38BDF8" VerticalAlignment="Center"/>
                        <Border Background="#1E293B" CornerRadius="4" Padding="6,2" Margin="10,0,0,0">
                            <TextBlock Text="v2.0" FontSize="10" FontWeight="Bold" Foreground="#94A3B8"/>
                        </Border>
                    </StackPanel>

                    <!-- Window Control Buttons (Minimize & Close) -->
                    <StackPanel Grid.Column="2" Orientation="Horizontal" VerticalAlignment="Center">
                        <Button Name="BtnMinimize" Content="-" Width="36" Height="28" Background="Transparent" Foreground="#94A3B8" BorderThickness="0" Cursor="Hand" FontSize="14" FontWeight="Bold">
                            <Button.Template>
                                <ControlTemplate TargetType="Button">
                                    <Border Background="{TemplateBinding Background}" CornerRadius="4">
                                        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                                    </Border>
                                </ControlTemplate>
                            </Button.Template>
                        </Button>
                        <Button Name="BtnClose" Content="X" Width="36" Height="28" Background="Transparent" Foreground="#EF4444" BorderThickness="0" Cursor="Hand" FontSize="12" FontWeight="Bold" Margin="4,0,0,0">
                            <Button.Template>
                                <ControlTemplate TargetType="Button">
                                    <Border x:Name="b" Background="{TemplateBinding Background}" CornerRadius="4">
                                        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                                    </Border>
                                    <ControlTemplate.Triggers>
                                        <Trigger Property="IsMouseOver" Value="True">
                                            <Setter TargetName="b" Property="Background" Value="#DC2626"/>
                                            <Setter Property="Foreground" Value="White"/>
                                        </Trigger>
                                    </ControlTemplate.Triggers>
                                </ControlTemplate>
                            </Button.Template>
                        </Button>
                    </StackPanel>
                </Grid>
            </Border>

            <!-- 2. INPUT & SETTINGS SECTION -->
            <Border Grid.Row="1" Background="#0F172A" Padding="18,14" BorderBrush="#1E293B" BorderThickness="0,0,0,1">
                <StackPanel>
                    <!-- URL Input Row -->
                    <Grid Margin="0,0,0,10">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="Auto"/>
                            <ColumnDefinition Width="Auto"/>
                        </Grid.ColumnDefinitions>

                        <!-- URL Box -->
                        <Border Grid.Column="0" Background="#1E293B" CornerRadius="6" BorderBrush="#334155" BorderThickness="1" Padding="10,2">
                            <Grid>
                                <TextBox Name="TxtUrl" Background="Transparent" Foreground="#F8FAFC" BorderThickness="0" FontSize="13" VerticalAlignment="Center" Text="https://proof.ovh.net/files/100Mb.dat"/>
                            </Grid>
                        </Border>

                        <!-- Paste Button -->
                        <Button Name="BtnPaste" Grid.Column="1" Style="{StaticResource ModernBtn}" Background="#334155" Margin="8,0,0,0" ToolTip="Paste URL from Clipboard">
                            <TextBlock Text="Paste" Foreground="#E2E8F0"/>
                        </Button>

                        <!-- Download / Start Button -->
                        <Button Name="BtnStart" Grid.Column="2" Style="{StaticResource ModernBtn}" Background="#2563EB" Margin="8,0,0,0" Padding="20,8">
                            <TextBlock Text="Start Download" FontWeight="Bold" Foreground="White"/>
                        </Button>
                    </Grid>

                    <!-- Settings Row: Threads, Directory, Filename -->
                    <Grid>
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="160"/>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="Auto"/>
                        </Grid.ColumnDefinitions>

                        <!-- Thread Selector Dropdown -->
                        <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                            <TextBlock Text="Threads:" Foreground="#94A3B8" VerticalAlignment="Center" Margin="0,0,8,0" FontSize="12"/>
                            <ComboBox Name="CmbThreads" Width="95" Background="#1E293B" Foreground="#0F172A" FontSize="12" SelectedIndex="2">
                                <ComboBoxItem Content="1 Thread"/>
                                <ComboBoxItem Content="4 Threads"/>
                                <ComboBoxItem Content="8 Threads"/>
                                <ComboBoxItem Content="16 Threads"/>
                                <ComboBoxItem Content="32 Threads"/>
                            </ComboBox>
                        </StackPanel>

                        <!-- Save Directory Row -->
                        <Grid Grid.Column="1" Margin="14,0,0,0">
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="Auto"/>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <TextBlock Grid.Column="0" Text="Save To:" Foreground="#94A3B8" VerticalAlignment="Center" Margin="0,0,8,0" FontSize="12"/>
                            <Border Grid.Column="1" Background="#1E293B" CornerRadius="6" BorderBrush="#334155" BorderThickness="1" Padding="8,4">
                                <TextBox Name="TxtOutputDir" Background="Transparent" Foreground="#CBD5E1" BorderThickness="0" FontSize="11" VerticalAlignment="Center"/>
                            </Border>
                            <Button Name="BtnBrowse" Grid.Column="2" Style="{StaticResource ModernBtn}" Background="#334155" Margin="6,0,0,0" Padding="10,4" Content="Browse..."/>
                        </Grid>
                    </Grid>
                </StackPanel>
            </Border>

            <!-- 3. MAIN DASHBOARD / CHUNKS VISUALIZER -->
            <Grid Grid.Row="2" Margin="18,12">
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/> <!-- Overall Progress Card -->
                    <RowDefinition Height="*"/>    <!-- Chunk Stream Cards ScrollViewer -->
                </Grid.RowDefinitions>

                <!-- Overall Progress Card -->
                <Border Grid.Row="0" Background="#111B38" CornerRadius="10" Padding="16,12" BorderBrush="#1E293B" BorderThickness="1" Margin="0,0,0,12">
                    <StackPanel>
                        <!-- Top Metadata / Speed Stats -->
                        <Grid Margin="0,0,0,8">
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>

                            <StackPanel Grid.Column="0" Orientation="Horizontal">
                                <TextBlock Name="TxtFileName" Text="Ready to download" FontWeight="Bold" FontSize="14" Foreground="#F8FAFC"/>
                                <Border Name="BadgeRange" Background="#065F46" CornerRadius="4" Padding="6,2" Margin="10,0,0,0">
                                    <TextBlock Name="TxtRangeSupport" Text="Range OK" FontSize="10" FontWeight="Bold" Foreground="#34D399"/>
                                </Border>
                            </StackPanel>

                            <StackPanel Grid.Column="1" Orientation="Horizontal">
                                <TextBlock Name="TxtOverallPercent" Text="0.0%" FontWeight="Bold" FontSize="16" Foreground="#38BDF8" Margin="0,0,14,0"/>
                                <TextBlock Name="TxtOverallSpeed" Text="0.00 MB/s" FontWeight="Bold" FontSize="14" Foreground="#10B981" Margin="0,0,14,0"/>
                                <TextBlock Name="TxtOverallEta" Text="ETA: --:--" FontWeight="SemiBold" FontSize="13" Foreground="#F59E0B" Margin="0,0,14,0"/>
                                <TextBlock Name="TxtElapsed" Text="Elapsed: 00:00" FontSize="12" Foreground="#94A3B8" VerticalAlignment="Center"/>
                            </StackPanel>
                        </Grid>

                        <!-- Overall Progress Bar -->
                        <ProgressBar Name="ProgressOverall" Style="{StaticResource GradientProgress}" Value="0" Maximum="100" Margin="0,0,0,6"/>

                        <!-- Sub-bar Detail: Transferred bytes / total -->
                        <Grid>
                            <TextBlock Name="TxtBytesProgress" Text="0 B / 0 B" FontSize="11" Foreground="#94A3B8" HorizontalAlignment="Left"/>
                            <TextBlock Name="TxtChunkCountLabel" Text="Parallel Stream Visualizer (Idle)" FontSize="11" Foreground="#64748B" HorizontalAlignment="Right"/>
                        </Grid>
                    </StackPanel>
                </Border>

                <!-- Dynamic Parallel Chunk Streams Visualizer -->
                <Border Grid.Row="1" Background="#0D1527" CornerRadius="10" BorderBrush="#1E293B" BorderThickness="1" Padding="12">
                    <Grid>
                        <Grid.RowDefinitions>
                            <RowDefinition Height="Auto"/>
                            <RowDefinition Height="*"/>
                        </Grid.RowDefinitions>

                        <TextBlock Grid.Row="0" Text="PARALLEL BYTE-RANGE STREAM ACCELERATOR TILES" FontSize="11" FontWeight="Bold" Foreground="#64748B" Margin="4,0,0,8"/>

                        <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto">
                            <!-- UniformGrid populated dynamically per thread count -->
                            <UniformGrid Name="ChunkGrid" Columns="4" Rows="2" Margin="0"/>
                        </ScrollViewer>
                    </Grid>
                </Border>
            </Grid>

            <!-- 4. ACTION CONTROLS (Pause, Resume, Cancel) -->
            <Border Grid.Row="3" Background="#0F172A" Padding="18,10" BorderBrush="#1E293B" BorderThickness="0,1,0,1">
                <Grid>
                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Left">
                        <Button Name="BtnPause" Style="{StaticResource ModernBtn}" Background="#D97706" Margin="0,0,10,0" IsEnabled="False">
                            <TextBlock Text="Pause"/>
                        </Button>
                        <Button Name="BtnResume" Style="{StaticResource ModernBtn}" Background="#059669" Margin="0,0,10,0" IsEnabled="False">
                            <TextBlock Text="Resume"/>
                        </Button>
                        <Button Name="BtnCancel" Style="{StaticResource ModernBtn}" Background="#DC2626" Margin="0,0,10,0" IsEnabled="False">
                            <TextBlock Text="Cancel"/>
                        </Button>
                    </StackPanel>

                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
                        <Button Name="BtnAntiGravity" Style="{StaticResource ModernBtn}" Background="#4F46E5" Padding="12,6" Margin="0,0,10,0" ToolTip="Launch Google Anti-Gravity Interactive Physics Visualizer">
                            <TextBlock Text="🌌 Anti-Gravity Mode" FontSize="11" FontWeight="Bold"/>
                        </Button>
                        <Button Name="BtnToggleLogs" Style="{StaticResource ModernBtn}" Background="#334155" Padding="10,6">
                            <TextBlock Name="TxtToggleLogs" Text="Terminal Logs" FontSize="11"/>
                        </Button>
                    </StackPanel>
                </Grid>
            </Border>

            <!-- 5. EXPANDABLE TERMINAL LOG CONSOLE -->
            <Border Name="LogContainer" Grid.Row="4" Background="#050B14" BorderBrush="#1E293B" BorderThickness="0,0,0,1" Height="130" Visibility="Visible">
                <Grid>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="24"/>
                        <RowDefinition Height="*"/>
                    </Grid.RowDefinitions>
                    
                    <Border Grid.Row="0" Background="#0A1120" Padding="8,2">
                        <Grid>
                            <TextBlock Text="LIVE ENGINE CONSOLE LOGS" FontSize="10" FontWeight="Bold" Foreground="#475569" VerticalAlignment="Center"/>
                            <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
                                <Button Name="BtnClearLogs" Content="Clear" Foreground="#64748B" Background="Transparent" BorderThickness="0" FontSize="10" Cursor="Hand" Margin="0,0,8,0"/>
                                <Button Name="BtnCopyLogs" Content="Copy" Foreground="#64748B" Background="Transparent" BorderThickness="0" FontSize="10" Cursor="Hand"/>
                            </StackPanel>
                        </Grid>
                    </Border>
                    <TextBox Name="TxtLogConsole" Grid.Row="1" Background="Transparent" Foreground="#38BDF8" BorderThickness="0" FontFamily="Consolas" FontSize="11" IsReadOnly="True" VerticalScrollBarVisibility="Auto" TextWrapping="Wrap" Padding="8"/>
                </Grid>
            </Border>

            <!-- 6. FOOTER STATUS BAR -->
            <Border Grid.Row="5" Background="#0A0F1D" CornerRadius="0,0,12,12" Padding="14,0">
                <Grid VerticalAlignment="Center">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <StackPanel Grid.Column="0" Orientation="Horizontal">
                        <Ellipse Name="DotStatus" Width="8" Height="8" Fill="#10B981" Margin="0,0,6,0"/>
                        <TextBlock Name="TxtFooterStatus" Text="Ready" FontSize="11" Foreground="#94A3B8"/>
                    </StackPanel>

                    <!-- SHA-256 Checksum Container -->
                    <StackPanel Grid.Column="1" Orientation="Horizontal">
                        <TextBlock Name="TxtHashLabel" Text="SHA-256: " FontSize="10" Foreground="#64748B" VerticalAlignment="Center"/>
                        <TextBlock Name="TxtHashValue" Text="Pending completion" FontSize="10" Foreground="#38BDF8" FontFamily="Consolas" VerticalAlignment="Center"/>
                        <Button Name="BtnCopyHash" Content="Copy" Background="Transparent" Foreground="#A78BFA" BorderThickness="0" FontSize="10" Cursor="Hand" Margin="6,0,0,0" Visibility="Collapsed"/>
                    </StackPanel>
                </Grid>
            </Border>
        </Grid>
    </Border>
</Window>
'@

# -----------------------------------------------------------------------------
# Parse XAML & Bind UI Controls (Resilient XmlNodeReader Method)
# -----------------------------------------------------------------------------
[xml]$xmlDoc = $xaml
$reader = [System.Xml.XmlNodeReader]::new($xmlDoc)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Element References
$titleBar          = $window.FindName("TitleBar")
$btnMinimize       = $window.FindName("BtnMinimize")
$btnClose          = $window.FindName("BtnClose")
$txtUrl            = $window.FindName("TxtUrl")
$btnPaste          = $window.FindName("BtnPaste")
$btnStart          = $window.FindName("BtnStart")
$cmbThreads        = $window.FindName("CmbThreads")
$txtOutputDir      = $window.FindName("TxtOutputDir")
$btnBrowse         = $window.FindName("BtnBrowse")
$txtFileName       = $window.FindName("TxtFileName")
$badgeRange        = $window.FindName("BadgeRange")
$txtRangeSupport   = $window.FindName("TxtRangeSupport")
$txtOverallPercent = $window.FindName("TxtOverallPercent")
$txtOverallSpeed   = $window.FindName("TxtOverallSpeed")
$txtOverallEta     = $window.FindName("TxtOverallEta")
$txtElapsed        = $window.FindName("TxtElapsed")
$progressOverall   = $window.FindName("ProgressOverall")
$txtBytesProgress  = $window.FindName("TxtBytesProgress")
$txtChunkCountLabel= $window.FindName("TxtChunkCountLabel")
$chunkGrid         = $window.FindName("ChunkGrid")
$btnPause          = $window.FindName("BtnPause")
$btnResume         = $window.FindName("BtnResume")
$btnCancel         = $window.FindName("BtnCancel")
$btnToggleLogs     = $window.FindName("BtnToggleLogs")
$txtToggleLogs     = $window.FindName("TxtToggleLogs")
$btnAntiGravity    = $window.FindName("BtnAntiGravity")
$logContainer      = $window.FindName("LogContainer")
$txtLogConsole     = $window.FindName("TxtLogConsole")
$btnClearLogs      = $window.FindName("BtnClearLogs")
$btnCopyLogs       = $window.FindName("BtnCopyLogs")
$dotStatus         = $window.FindName("DotStatus")
$txtFooterStatus   = $window.FindName("TxtFooterStatus")
$txtHashValue      = $window.FindName("TxtHashValue")
$btnCopyHash       = $window.FindName("BtnCopyHash")

# Set Default Output Directory
$defaultDownDir = [System.IO.Path]::Combine($env:USERPROFILE, "Downloads")
if (-not (Test-Path $defaultDownDir)) { $defaultDownDir = (Get-Location).Path }
$txtOutputDir.Text = $defaultDownDir

# -----------------------------------------------------------------------------
# Logging Helper
# -----------------------------------------------------------------------------
function Append-Log {
    param ([string]$Message, [string]$Level = "INFO")
    $timestamp = (Get-Date).ToString("HH:mm:ss")
    $line = "[$timestamp] [$Level] $Message`r`n"
    $window.Dispatcher.Invoke([Action]{
        $txtLogConsole.AppendText($line)
        $txtLogConsole.ScrollToEnd()
    })
}

Append-Log "Shuja Download Manager Pro v2.0 GUI Initialized."
Append-Log "Ready. Enter URL and select desired parallel threads."

# -----------------------------------------------------------------------------
# Window Chrome Behaviors (Drag, Minimize, Close)
# -----------------------------------------------------------------------------
$titleBar.Add_MouseLeftButtonDown({
    $window.DragMove()
})

$btnMinimize.Add_Click({
    $window.WindowState = [System.Windows.WindowState]::Minimized
})

$btnClose.Add_Click({
    if ($script:downloadRunning) {
        $msgBox = [System.Windows.Forms.MessageBox]::Show(
            "A download is currently in progress. Cancel download and exit?",
            "Confirm Exit",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        if ($msgBox -ne [System.Windows.Forms.DialogResult]::Yes) { return }
        $script:sharedState.IsCancelled = $true
    }
    $window.Close()
})

# -----------------------------------------------------------------------------
# Clipboard & Directory Browsing Handlers
# -----------------------------------------------------------------------------
$btnPaste.Add_Click({
    try {
        $clip = [System.Windows.Clipboard]::GetText()
        if (-not [string]::IsNullOrWhiteSpace($clip)) {
            $txtUrl.Text = $clip.Trim()
            Append-Log "Pasted URL from clipboard: $($txtUrl.Text)"
        }
    } catch {
        Append-Log "Failed to read clipboard: $($_.Exception.Message)" "WARN"
    }
})

$btnBrowse.Add_Click({
    $folderDialog = [System.Windows.Forms.FolderBrowserDialog]::new()
    $folderDialog.Description = "Select Destination Download Folder"
    $folderDialog.SelectedPath = $txtOutputDir.Text
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtOutputDir.Text = $folderDialog.SelectedPath
        Append-Log "Download path set to: $($txtOutputDir.Text)"
    }
})

# Launch Google Anti-Gravity Physics Visualizer
$btnAntiGravity.Add_Click({
    $visPath = Join-Path $PSScriptRoot "antigravity_visualizer.html"
    if (Test-Path $visPath) {
        Append-Log "Opening Google Anti-Gravity Interactive Physics Visualizer in browser..." "SUCCESS"
        Start-Process $visPath
    } else {
        [System.Windows.Forms.MessageBox]::Show(
            "Visualizer file not found: $visPath",
            "Anti-Gravity Visualizer",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
    }
})

# Toggle Console Logs Visibility
$btnToggleLogs.Add_Click({
    if ($logContainer.Visibility -eq [System.Windows.Visibility]::Visible) {
        $logContainer.Visibility = [System.Windows.Visibility]::Collapsed
        $txtToggleLogs.Text = "Show Logs"
    } else {
        $logContainer.Visibility = [System.Windows.Visibility]::Visible
        $txtToggleLogs.Text = "Hide Logs"
    }
})

$btnClearLogs.Add_Click({
    $txtLogConsole.Clear()
})

$btnCopyLogs.Add_Click({
    [System.Windows.Clipboard]::SetText($txtLogConsole.Text)
    Append-Log "Console logs copied to clipboard."
})

$btnCopyHash.Add_Click({
    [System.Windows.Clipboard]::SetText($txtHashValue.Text)
    Append-Log "SHA-256 hash copied to clipboard: $($txtHashValue.Text)"
})

# -----------------------------------------------------------------------------
# Helper Formatting Functions
# -----------------------------------------------------------------------------
function Format-Bytes {
    param ([long]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function Format-TimeSpan {
    param ([double]$Seconds)
    if ([double]::IsNaN($Seconds) -or [double]::IsInfinity($Seconds) -or $Seconds -lt 0) { return "--:--" }
    $ts = [TimeSpan]::FromSeconds([Math]::Min($Seconds, 863999))
    if ($ts.TotalHours -ge 1) { return "{0:D2}:{1:D2}:{2:D2}" -f [int]$ts.TotalHours, $ts.Minutes, $ts.Seconds }
    return "{0:D2}:{1:D2}" -f $ts.Minutes, $ts.Seconds
}

function Get-FFmpegPath {
    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe",
        "C:\ffmpeg\bin\ffmpeg.exe",
        "C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        "C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        "$env:USERPROFILE\scoop\shims\ffmpeg.exe"
    )
    foreach ($cand in $candidates) {
        $expanded = [System.Environment]::ExpandEnvironmentVariables($cand)
        if (Test-Path $expanded) { return $expanded }
    }
    $winget = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($winget) { return $winget.FullName }
    return $null
}

# -----------------------------------------------------------------------------
# Global State & Threading Variables
# -----------------------------------------------------------------------------
$script:downloadRunning = $false
$script:dispatcherTimer = $null
$script:sharedState     = $null
$script:chunkUiMap      = @{}
$script:engineRunspace  = $null
$script:stopwatch       = $null

# -----------------------------------------------------------------------------
# Dynamic Chunk Tile Generation
# -----------------------------------------------------------------------------
function Initialize-ChunkTiles {
    param ([int]$Count)
    $chunkGrid.Children.Clear()
    $script:chunkUiMap.Clear()

    # Adjust columns based on count
    if ($Count -le 4) {
        $chunkGrid.Columns = 2
        $chunkGrid.Rows = [Math]::Ceiling($Count / 2)
    } elseif ($Count -le 8) {
        $chunkGrid.Columns = 4
        $chunkGrid.Rows = 2
    } else {
        $chunkGrid.Columns = 4
        $chunkGrid.Rows = [Math]::Ceiling($Count / 4)
    }

    for ($i = 1; $i -le $Count; $i++) {
        $card = [System.Windows.Controls.Border]::new()
        $card.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#131D38")
        $card.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#1E293B")
        $card.BorderThickness = [System.Windows.Thickness]::new(1)
        $card.CornerRadius = [System.Windows.CornerRadius]::new(6)
        $card.Padding = [System.Windows.Thickness]::new(10, 8, 10, 8)
        $card.Margin = [System.Windows.Thickness]::new(4)

        $stack = [System.Windows.Controls.StackPanel]::new()

        # Top row: Chunk label + Status pill
        $row1 = [System.Windows.Controls.Grid]::new()
        $lblId = [System.Windows.Controls.TextBlock]::new()
        $lblId.Text = "Stream #$i"
        $lblId.FontSize = 11
        $lblId.FontWeight = [System.Windows.FontWeights]::Bold
        $lblId.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#E2E8F0")

        $pillBorder = [System.Windows.Controls.Border]::new()
        $pillBorder.CornerRadius = [System.Windows.CornerRadius]::new(4)
        $pillBorder.Padding = [System.Windows.Thickness]::new(6, 1, 6, 1)
        $pillBorder.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#334155")
        $pillBorder.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right

        $pillText = [System.Windows.Controls.TextBlock]::new()
        $pillText.Text = "WAIT"
        $pillText.FontSize = 9
        $pillText.FontWeight = [System.Windows.FontWeights]::Bold
        $pillText.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#94A3B8")
        $pillBorder.Child = $pillText

        $row1.Children.Add($lblId) | Out-Null
        $row1.Children.Add($pillBorder) | Out-Null
        $stack.Children.Add($row1) | Out-Null

        # Progress bar
        $prog = [System.Windows.Controls.ProgressBar]::new()
        $prog.Height = 6
        $prog.Margin = [System.Windows.Thickness]::new(0, 6, 0, 6)
        $prog.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#0B132B")
        $prog.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#38BDF8")
        $prog.Value = 0
        $prog.Maximum = 100
        $stack.Children.Add($prog) | Out-Null

        # Progress Stats
        $row2 = [System.Windows.Controls.Grid]::new()
        $lblBytes = [System.Windows.Controls.TextBlock]::new()
        $lblBytes.Text = "0 B / 0 B (0%)"
        $lblBytes.FontSize = 10
        $lblBytes.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#94A3B8")
        $lblBytes.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Left

        $lblSpeed = [System.Windows.Controls.TextBlock]::new()
        $lblSpeed.Text = "0.00 MB/s"
        $lblSpeed.FontSize = 10
        $lblSpeed.FontWeight = [System.Windows.FontWeights]::SemiBold
        $lblSpeed.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#10B981")
        $lblSpeed.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right

        $row2.Children.Add($lblBytes) | Out-Null
        $row2.Children.Add($lblSpeed) | Out-Null
        $stack.Children.Add($row2) | Out-Null

        $card.Child = $stack
        $chunkGrid.Children.Add($card) | Out-Null

        # Store elements in lookup map
        $script:chunkUiMap[$i] = @{
            Card       = $card
            ProgressBar= $prog
            PillBorder = $pillBorder
            PillText   = $pillText
            BytesLabel = $lblBytes
            SpeedLabel = $lblSpeed
        }
    }
}

# -----------------------------------------------------------------------------
# Download Action Button Triggers
# -----------------------------------------------------------------------------
$btnStart.Add_Click({
    $targetUrl = $txtUrl.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($targetUrl)) {
        [System.Windows.Forms.MessageBox]::Show("Please enter a valid download URL.", "URL Required", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }

    $outDir = $txtOutputDir.Text.Trim()
    if (-not (Test-Path $outDir)) {
        try { [System.IO.Directory]::CreateDirectory($outDir) | Out-Null } catch {
            [System.Windows.Forms.MessageBox]::Show("Failed to create destination folder: $($_.Exception.Message)", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            return
        }
    }

    # Extract thread count from dropdown
    $threadStr = $cmbThreads.Text
    $threadCount = 8
    if ($threadStr -match '(\d+)') { $threadCount = [int]$matches[1] }
    if ($targetUrl -match "^https?://([a-zA-Z0-9-]+\.)*(youtube\.com|youtu\.be)/" -and $threadCount -lt 8) {
        $threadCount = 8
        $cmbThreads.Text = "8 Threads"
    }

    Start-DownloadFlow -Url $targetUrl -OutDirectory $outDir -Threads $threadCount
})

$btnPause.Add_Click({
    if ($script:sharedState) {
        $script:sharedState.IsPaused = $true
        $btnPause.IsEnabled = $false
        $btnResume.IsEnabled = $true
        Append-Log "Download paused by user." "WARN"
        $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#F59E0B")
        $txtFooterStatus.Text = "Paused"
    }
})

$btnResume.Add_Click({
    if ($script:sharedState) {
        $script:sharedState.IsPaused = $false
        $btnPause.IsEnabled = $true
        $btnResume.IsEnabled = $false
        Append-Log "Download resumed by user." "INFO"
        $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#10B981")
        $txtFooterStatus.Text = "Downloading..."
    }
})

$btnCancel.Add_Click({
    if ($script:sharedState) {
        $script:sharedState.IsCancelled = $true
        Append-Log "Cancellation signal sent..." "WARN"
        $btnPause.IsEnabled = $false
        $btnResume.IsEnabled = $false
        $btnCancel.IsEnabled = $false
    }
})

# -----------------------------------------------------------------------------
# Background Download Engine Orchestration
# -----------------------------------------------------------------------------
function Start-DownloadFlow {
    param (
        [string]$Url,
        [string]$OutDirectory,
        [int]$Threads
    )

    $btnStart.IsEnabled = $false
    $btnPause.IsEnabled = $true
    $btnResume.IsEnabled = $false
    $btnCancel.IsEnabled = $true
    $cmbThreads.IsEnabled = $false
    $btnBrowse.IsEnabled = $false
    $txtUrl.IsEnabled = $false

    $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#38BDF8")
    $txtFooterStatus.Text = "Probing URL metadata..."
    $txtHashValue.Text = "Computing upon finish..."
    $btnCopyHash.Visibility = [System.Windows.Visibility]::Collapsed

    # Initialize Chunk Visualizer Tiles
    Initialize-ChunkTiles -Count $Threads
    $txtChunkCountLabel.Text = "$Threads Parallel Byte-Range Streams Active"

    # Initialize Synchronized Shared State
    $script:sharedState = [hashtable]::Synchronized(@{
        IsPaused     = $false
        IsCancelled  = $false
        IsComplete   = $false
        HasError     = $false
        ErrorMessage = ""
        FinalFile    = ""
        FileLength   = [long]0
        AssemblyTime = [double]0.0
        Sha256Hash   = ""
        Chunks       = [hashtable]::Synchronized(@{})
        Logs         = [System.Collections.Generic.List[string]]::new()
    })

    # Start DispatcherTimer for UI Updates (10 Hz = 100ms)
    $script:stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $script:downloadRunning = $true

    $script:dispatcherTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $script:dispatcherTimer.Interval = [TimeSpan]::FromMilliseconds(100)
    $script:dispatcherTimer.Add_Tick({ Update-DashboardTick })
    $script:dispatcherTimer.Start()

    # Launch Engine in Background Runspace
    $engineScript = {
        param($TargetUrl, $OutFolder, $ReqThreads, $State)

        Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        [Net.ServicePointManager]::DefaultConnectionLimit = 64

        function Add-EngineLog ($msg, $lvl="INFO") {
            [System.Threading.Monitor]::Enter($State.Logs)
            try { $State.Logs.Add("[$lvl] $msg") | Out-Null } finally { [System.Threading.Monitor]::Exit($State.Logs) }
        }

        Add-EngineLog "Starting probe for: $TargetUrl"

        $isYouTube = ($TargetUrl -match "^https?://([a-zA-Z0-9-]+\.)*(youtube\.com|youtu\.be)/")
        $finalUrl = $TargetUrl
        $contentLength = -1
        $acceptRanges = $false
        $fileName = ""

        if ($isYouTube) {
            Add-EngineLog "YouTube video URL detected: $TargetUrl" "INFO"
            Add-EngineLog "Resolving video/audio tracks with yt-dlp..." "INFO"

            # Locate yt-dlp
            $ytdlp = $null
            $cmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
            if ($cmd) { $ytdlp = $cmd.Source }
            else {
                $candidates = @(
                    "C:\Python314\Scripts\yt-dlp.exe",
                    "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\yt-dlp.exe",
                    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\yt-dlp.exe",
                    "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\yt-dlp.exe"
                )
                foreach ($cand in $candidates) {
                    if (Test-Path $cand) { $ytdlp = $cand; break }
                }
            }

            if (-not $ytdlp) {
                Add-EngineLog "yt-dlp is not installed. Install via: python -m pip install -U yt-dlp" "ERR"
                $State.HasError = $true
                $State.ErrorMessage = "yt-dlp is not installed. Run: python -m pip install -U yt-dlp"
                return
            }

            # Locate ffmpeg
            $ffmpeg = $null
            $ffcmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
            if ($ffcmd) { $ffmpeg = $ffcmd.Source }
            else {
                $ffcandidates = @(
                    "C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe",
                    "C:\ffmpeg\bin\ffmpeg.exe",
                    "C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                    "C:\ProgramData\chocolatey\bin\ffmpeg.exe",
                    "$env:USERPROFILE\scoop\shims\ffmpeg.exe"
                )
                foreach ($cand in $ffcandidates) {
                    $exp = [System.Environment]::ExpandEnvironmentVariables($cand)
                    if (Test-Path $exp) { $ffmpeg = $exp; break }
                }
                if (-not $ffmpeg) {
                    $winget = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                    if ($winget) { $ffmpeg = $winget.FullName }
                }
            }

            if ($ffmpeg) {
                Add-EngineLog "Local FFmpeg detected: $ffmpeg" "INFO"
            } else {
                Add-EngineLog "Local FFmpeg not found. Video and audio tracks may not be merged." "WARN"
            }

            # Query video formats and metadata via JSON
            $jsonArgs = @(
                "--no-warnings",
                "--no-playlist",
                "--js-runtimes", "node",
                "--remote-components", "ejs:github",
                "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
                "-j",
                $TargetUrl
            )

            $jsonRaw = & $ytdlp $jsonArgs 2>&1
            $ytJson = $null
            try { $ytJson = $jsonRaw | ConvertFrom-Json } catch {}

            if ($ytJson) {
                $rawTitle = $ytJson.title
                $invalidChars = [System.IO.Path]::GetInvalidFileNameChars()
                $safeTitle = -join ($rawTitle.ToCharArray() | ForEach-Object { if ($invalidChars -contains $_) { '_' } else { $_ } })
                $safeTitle = $safeTitle.Trim(" ._")
                if ([string]::IsNullOrWhiteSpace($safeTitle)) { $safeTitle = "YouTube_Video_" + (Get-Date -Format "yyyyMMdd_HHmmss") }
                $finalMp4 = [System.IO.Path]::Combine($OutFolder, "$safeTitle.mp4")
                $State.FinalFile = $finalMp4

                $isDash = ($ytJson.requested_formats -and $ytJson.requested_formats.Count -ge 2)
                if ($isDash) {
                    $vFmt = $ytJson.requested_formats[0]
                    $aFmt = $ytJson.requested_formats[1]
                    $vSize = if ($vFmt.filesize) { [long]$vFmt.filesize } elseif ($vFmt.filesize_approx) { [long]$vFmt.filesize_approx } else { 0 }
                    $aSize = if ($aFmt.filesize) { [long]$aFmt.filesize } elseif ($aFmt.filesize_approx) { [long]$aFmt.filesize_approx } else { 0 }
                    $totSize = $vSize + $aSize
                    $res = if ($vFmt.resolution) { $vFmt.resolution } else { "$($vFmt.width)x$($vFmt.height)" }
                    $State.FileLength = $totSize

                    Add-EngineLog "YouTube DASH stream detected: $res ($rawTitle)" "SUCCESS"
                    Add-EngineLog "Best Video Track: $res [$($vFmt.ext)] ($(Format-Bytes $vSize))" "INFO"
                    Add-EngineLog "Best Audio Track: [$($aFmt.ext)] ($(Format-Bytes $aSize))" "INFO"
                    Add-EngineLog "Total Media Size: $(Format-Bytes $totSize)" "INFO"
                    Add-EngineLog "Downloading best video and audio tracks with $ReqThreads concurrent connections..." "INFO"

                    # Download separate tracks with template
                    $tempTemplate = [System.IO.Path]::Combine($OutFolder, "$safeTitle.track.%(format_id)s.%(ext)s")
                    $dlArgs = @(
                        "--no-warnings",
                        "--no-playlist",
                        "--js-runtimes", "node",
                        "--remote-components", "ejs:github",
                        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
                        "-N", "$ReqThreads",
                        "--newline",
                        "-o", $tempTemplate,
                        $TargetUrl
                    )

                    $pinfo = [System.Diagnostics.ProcessStartInfo]::new()
                    $pinfo.FileName = $ytdlp
                    $pinfo.Arguments = ($dlArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join " "
                    $pinfo.RedirectStandardOutput = $true
                    $pinfo.RedirectStandardError = $true
                    $pinfo.UseShellExecute = $false
                    $pinfo.CreateNoWindow = $true

                    $proc = [System.Diagnostics.Process]::Start($pinfo)
                    while (-not $proc.HasExited) {
                        if ($State.IsCancelled) {
                            try { $proc.Kill() } catch {}
                            Add-EngineLog "Download cancelled by user." "WARN"
                            return
                        }
                        $line = $proc.StandardOutput.ReadLine()
                        if ($line) {
                            if ($line -match '\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*[KMG]iB)\s+at\s+(\d+\.?\d*[KMG]iB/s)\s+ETA\s+(\d+:\d+)') {
                                $pct = [double]$matches[1]
                                $spd = $matches[3]
                                $eta = $matches[4]
                                if ($State.Chunks[1]) {
                                    $c1 = $State.Chunks[1]
                                    $c1.Status = "Downloading ($spd)"
                                    $c1.DownloadedBytes = [long](($pct / 100.0) * $totSize)
                                    $c1.TotalBytes = $totSize
                                }
                            } elseif ($line.StartsWith("[download] Destination")) {
                                Add-EngineLog $line "INFO"
                            }
                        }
                    }
                    $proc.WaitForExit()

                    # Find downloaded tracks
                    $trackFiles = Get-ChildItem -Path $OutFolder -Filter "$safeTitle.track.*" -ErrorAction SilentlyContinue
                    $vFile = $trackFiles | Where-Object { $_.Extension -match '^\.(mp4|webm|mkv)$' -and $_.Name -notmatch 'audio' } | Select-Object -First 1
                    $aFile = $trackFiles | Where-Object { $_.Extension -match '^\.(m4a|webm|opus|aac)$' -or $_.Name -match 'audio' } | Select-Object -First 1

                    if ($vFile -and $aFile -and $ffmpeg) {
                        Add-EngineLog "Best video track downloaded: $($vFile.Name) ($(Format-Bytes $vFile.Length))" "SUCCESS"
                        Add-EngineLog "Best audio track downloaded: $($aFile.Name) ($(Format-Bytes $aFile.Length))" "SUCCESS"
                        Add-EngineLog "Muxing video and audio tracks with local ffmpeg into MP4..." "INFO"
                        $audioCodec = if ($aFile.Extension -match '^\.(m4a|aac)$') { "copy" } else { "aac" }
                        $muxArgs = @(
                            "-y",
                            "-hide_banner",
                            "-loglevel", "warning",
                            "-i", $vFile.FullName,
                            "-i", $aFile.FullName,
                            "-c:v", "copy",
                            "-c:a", $audioCodec,
                            "-movflags", "+faststart",
                            $finalMp4
                        )

                        $muxSw = [System.Diagnostics.Stopwatch]::StartNew()
                        $muxProc = & $ffmpeg $muxArgs 2>&1
                        $muxSw.Stop()

                        if ($LASTEXITCODE -eq 0 -and (Test-Path $finalMp4) -and ((Get-Item $finalMp4).Length -gt 0)) {
                            Add-EngineLog "Muxing complete in $($muxSw.Elapsed.TotalSeconds.ToString('N2'))s! Non-silent MP4 generated." "SUCCESS"
                            Remove-Item $vFile.FullName -Force -ErrorAction SilentlyContinue
                            Remove-Item $aFile.FullName -Force -ErrorAction SilentlyContinue
                            Add-EngineLog "Temporary track files cleaned up." "INFO"
                        } else {
                            Add-EngineLog "ffmpeg mux warning: " + ($muxProc | Out-String) "WARN"
                        }
                    } elseif ($trackFiles.Count -eq 1) {
                        Move-Item -Path $trackFiles[0].FullName -Destination $finalMp4 -Force -ErrorAction SilentlyContinue
                    }

                    if (Test-Path $finalMp4) {
                        $finalLen = (Get-Item $finalMp4).Length
                        $State.FileLength = $finalLen
                        Add-EngineLog "Calculating SHA-256 checksum..." "INFO"
                        $hSw = [System.Diagnostics.Stopwatch]::StartNew()
                        $hashVal = (Get-FileHash -Path $finalMp4 -Algorithm SHA256).Hash
                        $hSw.Stop()
                        $State.Sha256Hash = $hashVal
                        Add-EngineLog "SHA-256: $hashVal" "SUCCESS"
                        Add-EngineLog "Download, Mux & Verification Complete! Final File: $(Format-Bytes $finalLen)" "SUCCESS"
                        $State.IsComplete = $true
                        return
                    } else {
                        $State.HasError = $true
                        $State.ErrorMessage = "Failed to produce merged MP4 file."
                        return
                    }
                } else {
                    # Progressive single stream: Pipe into multi-thread accelerator
                    $fileName = "$safeTitle.mp4"
                    $finalUrl = $ytJson.url
                    if ($ytJson.filesize) { $contentLength = [long]$ytJson.filesize }
                    Add-EngineLog "Progressive single stream acquired: $fileName ($(Format-Bytes $contentLength))" "SUCCESS"
                    Add-EngineLog "Routing into $ReqThreads-thread Runspace accelerator..." "SUCCESS"
                }
            } else {
                Add-EngineLog "Could not resolve JSON metadata. Attempting direct fallback download via yt-dlp..." "WARN"
                $safeTarget = [System.IO.Path]::Combine($OutFolder, "YouTube_Video_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".mp4")
                $tempTemplate = [System.IO.Path]::Combine($OutFolder, "yt_dlp_track.%(format_id)s.%(ext)s")
                $dlArgs = @(
                    "--no-warnings",
                    "--no-playlist",
                    "--js-runtimes", "node",
                    "--remote-components", "ejs:github",
                    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
                    "-N", "$ReqThreads",
                    "-o", $tempTemplate,
                    $TargetUrl
                )
                & $ytdlp $dlArgs
                
                # Scan for track files and mux
                $trackFiles = Get-ChildItem -Path $OutFolder -Filter "yt_dlp_track.*" -ErrorAction SilentlyContinue
                $vFile = $trackFiles | Where-Object { $_.Extension -match '^\.(mp4|webm|mkv)$' -and $_.Name -notmatch 'audio' } | Select-Object -First 1
                $aFile = $trackFiles | Where-Object { $_.Extension -match '^\.(m4a|webm|opus|aac)$' -or $_.Name -match 'audio' } | Select-Object -First 1

                if ($vFile -and $aFile -and $ffmpeg) {
                    Add-EngineLog "Muxing fallback tracks with local ffmpeg..." "INFO"
                    & $ffmpeg -y -hide_banner -loglevel warning -i $vFile.FullName -i $aFile.FullName -c:v copy -c:a aac -movflags +faststart $safeTarget
                    Remove-Item $vFile.FullName -Force -ErrorAction SilentlyContinue
                    Remove-Item $aFile.FullName -Force -ErrorAction SilentlyContinue
                }

                if (Test-Path $safeTarget) {
                    $State.FinalFile = $safeTarget
                    $State.FileLength = (Get-Item $safeTarget).Length
                    $State.Sha256Hash = (Get-FileHash -Path $safeTarget -Algorithm SHA256).Hash
                    $State.IsComplete = $true
                    Add-EngineLog "YouTube video downloaded and muxed successfully via yt-dlp!" "SUCCESS"
                    return
                } else {
                    $State.HasError = $true
                    $State.ErrorMessage = "yt-dlp download failed."
                    return
                }
            }
        }

        $handler = [System.Net.Http.HttpClientHandler]::new()
        $handler.AllowAutoRedirect = $true
        $client = [System.Net.Http.HttpClient]::new($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(15)

        try {
            if ($isYouTube -and -not [string]::IsNullOrWhiteSpace($finalUrl)) {
                # Probe direct YouTube CDN stream with Range
                $probe = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $finalUrl)
                $probe.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new(0, 0)
                $probeResp = $client.SendAsync($probe, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
                if ($probeResp.StatusCode -eq [System.Net.HttpStatusCode]::PartialContent) {
                    $acceptRanges = $true
                    if ($probeResp.Content.Headers.ContentRange -and $probeResp.Content.Headers.ContentRange.Length) {
                        $contentLength = [long]$probeResp.Content.Headers.ContentRange.Length
                    }
                } elseif ($probeResp.Content.Headers.ContentLength) {
                    $contentLength = [long]$probeResp.Content.Headers.ContentLength
                }
                $probeResp.Dispose()
            } else {
                $head = $client.SendAsync([System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, $finalUrl)).GetAwaiter().GetResult()
                if ($head.Content.Headers.ContentLength) { $contentLength = [long]$head.Content.Headers.ContentLength }
                if ($head.Headers.AcceptRanges -contains "bytes") { $acceptRanges = $true }

                # Range fallback probe
                if ($contentLength -le 0 -or -not $acceptRanges) {
                    $probe = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $finalUrl)
                    $probe.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new(0, 0)
                    $probeResp = $client.SendAsync($probe, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
                    if ($probeResp.StatusCode -eq [System.Net.HttpStatusCode]::PartialContent) {
                        $acceptRanges = $true
                        if ($probeResp.Content.Headers.ContentRange -and $probeResp.Content.Headers.ContentRange.Length) {
                            $contentLength = [long]$probeResp.Content.Headers.ContentRange.Length
                        }
                    } elseif ($probeResp.Content.Headers.ContentLength) {
                        $contentLength = [long]$probeResp.Content.Headers.ContentLength
                    }
                    $probeResp.Dispose()
                }
            }
        } catch {
            Add-EngineLog "Probe failed: $($_.Exception.Message)" "ERR"
            $State.HasError = $true
            $State.ErrorMessage = "Connection probe failed: $($_.Exception.Message)"
            return
        }

        if ([string]::IsNullOrWhiteSpace($fileName)) {
            $fileName = [System.IO.Path]::GetFileName(([System.Uri]$finalUrl).LocalPath)
            if ([string]::IsNullOrWhiteSpace($fileName) -or $fileName -eq "/") { $fileName = "downloaded_file.bin" }
        }
        $finalPath = [System.IO.Path]::Combine($OutFolder, $fileName)

        $State.FinalFile = $finalPath
        $State.FileLength = $contentLength

        Add-EngineLog "Target resolved: $fileName (Length: $(Format-Bytes $contentLength), Ranges: $acceptRanges)"

        if (-not $acceptRanges -or $contentLength -le 0) {
            $ReqThreads = 1
        }

        # Calculate chunk slices
        $chunkSize = [long][Math]::Floor($contentLength / $ReqThreads)
        $chunksList = @()
        for ($i = 0; $i -lt $ReqThreads; $i++) {
            $s = [long]($i * $chunkSize)
            $e = if ($i -eq ($ReqThreads - 1)) { [long]($contentLength - 1) } else { [long](($i + 1) * $chunkSize - 1) }
            $tot = [long]($e - $s + 1)
            $part = "$finalPath.part$($i + 1)"

            if (Test-Path $part) { Remove-Item $part -Force -ErrorAction SilentlyContinue }

            $chk = [hashtable]::Synchronized(@{
                Id              = ($i + 1)
                StartByte       = $s
                EndByte         = $e
                TotalBytes      = $tot
                PartFile        = $part
                DownloadedBytes = [long]0
                SpeedMBs        = [double]0.0
                ETASeconds      = [double]0.0
                Status          = "Connecting"
                LastBytes       = [long]0
                LastTicks       = [System.DateTime]::UtcNow.Ticks
            })
            $State.Chunks[($i + 1)] = $chk
            $chunksList += $chk
        }

        # Worker scriptblock for Runspaces
        $workerBlock = {
            param($CId, $Url, $StMap, $GlobalState)
            $cState = $StMap[$CId]
            $partPath = $cState.PartFile
            $start = $cState.StartByte
            $end = $cState.EndByte
            $total = $cState.TotalBytes

            if ($CId -gt 1) { Start-Sleep -Milliseconds (($CId - 1) * 120) }

            $retries = 0
            while ($retries -lt 5 -and -not $GlobalState.IsCancelled) {
                # Handle Pause state
                while ($GlobalState.IsPaused -and -not $GlobalState.IsCancelled) {
                    $cState.Status = "Paused"
                    Start-Sleep -Milliseconds 300
                }
                if ($GlobalState.IsCancelled) { break }

                $curDown = [long]$cState.DownloadedBytes
                if ($curDown -ge $total) {
                    $cState.Status = "Completed"
                    break
                }

                $curStart = $start + $curDown
                $fStream = $null
                $nStream = $null
                $client = $null
                $resp = $null

                try {
                    $cState.Status = if ($retries -gt 0) { "Connecting (Retry $retries)" } else { "Connecting" }

                    $h = [System.Net.Http.HttpClientHandler]::new()
                    $client = [System.Net.Http.HttpClient]::new($h)
                    $client.Timeout = [TimeSpan]::FromSeconds(25)

                    $req = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $Url)
                    $req.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new($curStart, $end)

                    $resp = $client.SendAsync($req, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
                    $resp.EnsureSuccessStatusCode() | Out-Null

                    $nStream = $resp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
                    try { if ($nStream.CanTimeout) { $nStream.ReadTimeout = 20000 } } catch {}

                    $fMode = if ($curDown -gt 0) { [System.IO.FileMode]::Append } else { [System.IO.FileMode]::Create }
                    $fStream = [System.IO.FileStream]::new($partPath, $fMode, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None, 65536)

                    $buf = [byte[]]::new(65536)
                    $cState.Status = "Downloading"

                    while ($true) {
                        if ($GlobalState.IsCancelled) { break }
                        while ($GlobalState.IsPaused -and -not $GlobalState.IsCancelled) {
                            $cState.Status = "Paused"
                            Start-Sleep -Milliseconds 300
                        }

                        $read = $nStream.Read($buf, 0, $buf.Length)
                        if ($read -le 0) { break }

                        $fStream.Write($buf, 0, $read)
                        $cState.DownloadedBytes = [long]($cState.DownloadedBytes + $read)
                    }

                    $fStream.Flush()
                    if ($cState.DownloadedBytes -ge $total) {
                        $cState.Status = "Completed"
                        break
                    }
                } catch {
                    $retries++
                    Start-Sleep -Milliseconds (400 * $retries)
                } finally {
                    if ($fStream) { $fStream.Dispose() }
                    if ($nStream) { $nStream.Dispose() }
                    if ($resp) { $resp.Dispose() }
                    if ($client) { $client.Dispose() }
                }
            }
        }

        # Initialize RunspacePool
        $pool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool($ReqThreads, $ReqThreads)
        $pool.Open()

        $taskList = @()
        foreach ($c in $chunksList) {
            $ps = [System.Management.Automation.PowerShell]::Create()
            $ps.RunspacePool = $pool
            [void]$ps.AddScript($workerBlock).AddParameter("CId", $c.Id).AddParameter("Url", $finalUrl).AddParameter("StMap", $State.Chunks).AddParameter("GlobalState", $State)
            $taskList += [PSCustomObject]@{ Id = $c.Id; PS = $ps; Handle = $ps.BeginInvoke() }
        }

        # Monitor loop
        while (-not $State.IsCancelled) {
            $allDone = $true
            foreach ($t in $taskList) {
                if (-not $t.Handle.IsCompleted -or $State.Chunks[$t.Id].Status -ne "Completed") {
                    $allDone = $false
                }
            }
            if ($allDone) { break }
            Start-Sleep -Milliseconds 200
        }

        # Cleanup runspaces
        foreach ($t in $taskList) { $t.PS.Dispose() }
        $pool.Close()
        $pool.Dispose()

        if ($State.IsCancelled) {
            Add-EngineLog "Download cancelled by user. Cleaning up part files..." "WARN"
            foreach ($c in $chunksList) {
                if (Test-Path $c.PartFile) { Remove-Item $c.PartFile -Force -ErrorAction SilentlyContinue }
            }
            return
        }

        # Reassemble
        Add-EngineLog "All $ReqThreads chunks completed. Merging parts into $fileName..."
        $asSw = [System.Diagnostics.Stopwatch]::StartNew()
        $finalStream = [System.IO.FileStream]::new($finalPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None, 1048576)

        try {
            foreach ($c in $chunksList) {
                $pStream = [System.IO.FileStream]::new($c.PartFile, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read, 1048576)
                try { $pStream.CopyTo($finalStream, 1048576) } finally { $pStream.Dispose() }
                Remove-Item $c.PartFile -Force -ErrorAction SilentlyContinue
            }
            $finalStream.Flush()
        } finally {
            $finalStream.Dispose()
            $asSw.Stop()
        }

        $State.AssemblyTime = $asSw.Elapsed.TotalSeconds
        Add-EngineLog "Reassembly completed in $($asSw.Elapsed.TotalSeconds.ToString('N2'))s."

        # Compute SHA-256
        Add-EngineLog "Calculating SHA-256 checksum..."
        $hSw = [System.Diagnostics.Stopwatch]::StartNew()
        $hashVal = (Get-FileHash -Path $finalPath -Algorithm SHA256).Hash
        $hSw.Stop()
        $State.Sha256Hash = $hashVal
        Add-EngineLog "SHA-256: $hashVal (computed in $($hSw.Elapsed.TotalSeconds.ToString('N2'))s)"

        $State.IsComplete = $true
    }

    # Start asynchronous Runspace for Engine
    $script:engineRunspace = [System.Management.Automation.PowerShell]::Create()
    [void]$script:engineRunspace.AddScript($engineScript)
    [void]$script:engineRunspace.AddParameter("TargetUrl", $Url)
    [void]$script:engineRunspace.AddParameter("OutFolder", $OutDirectory)
    [void]$script:engineRunspace.AddParameter("ReqThreads", $Threads)
    [void]$script:engineRunspace.AddParameter("State", $script:sharedState)

    $script:engineRunspace.BeginInvoke()
}

# -----------------------------------------------------------------------------
# DispatcherTimer Tick Handler (Runs at 10 FPS on UI Thread)
# -----------------------------------------------------------------------------
function Update-DashboardTick {
    if (-not $script:sharedState) { return }

    # Drain any engine logs to UI console
    [System.Threading.Monitor]::Enter($script:sharedState.Logs)
    try {
        while ($script:sharedState.Logs.Count -gt 0) {
            $entry = $script:sharedState.Logs[0]
            $script:sharedState.Logs.RemoveAt(0)
            Append-Log $entry
        }
    } finally {
        [System.Threading.Monitor]::Exit($script:sharedState.Logs)
    }

    # Check for Error or Cancellation
    if ($script:sharedState.HasError) {
        $script:dispatcherTimer.Stop()
        $script:downloadRunning = $false
        $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#EF4444")
        $txtFooterStatus.Text = "Error: $($script:sharedState.ErrorMessage)"
        Append-Log "DOWNLOAD FAILED: $($script:sharedState.ErrorMessage)" "ERR"
        Reset-UIControls
        return
    }

    if ($script:sharedState.IsCancelled) {
        $script:dispatcherTimer.Stop()
        $script:downloadRunning = $false
        $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#EF4444")
        $txtFooterStatus.Text = "Download cancelled"
        Append-Log "Download cancelled by user." "WARN"
        Reset-UIControls
        return
    }

    # Update metadata if available
    if ($script:sharedState.FileLength -gt 0 -and $txtFileName.Text -eq "Ready to download") {
        $txtFileName.Text = [System.IO.Path]::GetFileName($script:sharedState.FinalFile)
        $badgeRange.Visibility = [System.Windows.Visibility]::Visible
    }

    # Compute speeds and totals
    $totalLength = [long]$script:sharedState.FileLength
    $totalDownloaded = [long]0
    $overallInstantSpeed = 0.0

    $now = [System.DateTime]::UtcNow.Ticks

    foreach ($id in $script:sharedState.Chunks.Keys) {
        $c = $script:sharedState.Chunks[$id]
        $cDown = [long]$c.DownloadedBytes
        $cTot = [long]$c.TotalBytes
        $totalDownloaded += $cDown

        # Speed calculation
        $dt = ($now - $c.LastTicks) / 10000000.0
        if ($dt -ge 0.4) {
            $deltaBytes = $cDown - $c.LastBytes
            $instSpeed = if ($dt -gt 0) { ($deltaBytes / (1024 * 1024)) / $dt } else { 0.0 }
            $c.SpeedMBs = ($c.SpeedMBs * 0.7) + ($instSpeed * 0.3)
            $c.LastBytes = $cDown
            $c.LastTicks = $now
        }

        # Update Chunk Card UI
        if ($script:chunkUiMap.ContainsKey($id)) {
            $ui = $script:chunkUiMap[$id]
            $cPercent = if ($cTot -gt 0) { [Math]::Min(100.0, ($cDown / $cTot) * 100.0) } else { 0.0 }
            $ui.ProgressBar.Value = $cPercent

            $ui.BytesLabel.Text = "{0} / {1} ({2:N1}%)" -f (Format-Bytes $cDown), (Format-Bytes $cTot), $cPercent
            $ui.SpeedLabel.Text = "{0:N2} MB/s" -f $c.SpeedMBs

            # Update Pill
            $statusText = $c.Status
            $pillColor = switch -Wildcard ($statusText) {
                "Completed"   { "#10B981" } # Green
                "Downloading" { "#38BDF8" } # Blue
                "Connecting*" { "#F59E0B" } # Amber
                "Paused"      { "#F97316" } # Orange
                "Error"       { "#EF4444" } # Red
                Default       { "#64748B" }
            }
            $ui.PillText.Text = switch -Wildcard ($statusText) {
                "Completed"   { "DONE" }
                "Downloading" { "BUSY" }
                "Connecting*" { "CONN" }
                "Paused"      { "PAUSE" }
                "Error"       { "ERR" }
                Default       { "WAIT" }
            }
            $ui.PillBorder.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString($pillColor)
            $ui.PillText.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FFFFFF")
        }
    }

    # Overall Metrics
    $overallPercent = if ($totalLength -gt 0) { [Math]::Min(100.0, ($totalDownloaded / $totalLength) * 100.0) } else { 0.0 }
    $progressOverall.Value = $overallPercent
    $txtOverallPercent.Text = "{0:N1}%" -f $overallPercent

    $elapsedSec = $script:stopwatch.Elapsed.TotalSeconds
    $avgSpeedMBs = if ($elapsedSec -gt 0) { ($totalDownloaded / (1024 * 1024)) / $elapsedSec } else { 0.0 }
    $txtOverallSpeed.Text = "{0:N2} MB/s" -f $avgSpeedMBs

    $remBytes = [Math]::Max([long]0, ($totalLength - $totalDownloaded))
    $etaSec = if ($avgSpeedMBs -gt 0.05) { ($remBytes / (1024 * 1024)) / $avgSpeedMBs } else { -1 }
    $txtOverallEta.Text = "ETA: " + (Format-TimeSpan $etaSec)
    $txtElapsed.Text = "Elapsed: " + (Format-TimeSpan $elapsedSec)

    $txtBytesProgress.Text = "{0} / {1}" -f (Format-Bytes $totalDownloaded), (Format-Bytes $totalLength)
    $txtFooterStatus.Text = "Downloading: {0:N1}% | {1:N2} MB/s | {2}" -f $overallPercent, $avgSpeedMBs, (Format-TimeSpan $etaSec)

    # Sync Live Metrics to Anti-Gravity Visualizer JSON
    try {
        $syncChunks = @()
        foreach ($cid in ($script:sharedState.Chunks.Keys | Sort-Object)) {
            $ch = $script:sharedState.Chunks[$cid]
            $cTot = [long]$ch.TotalBytes
            $cDown = [long]$ch.DownloadedBytes
            $cPct = if ($cTot -gt 0) { [Math]::Min(100.0, ($cDown / $cTot) * 100.0) } else { 0.0 }
            $syncChunks += @{
                id      = [int]$cid
                percent = [Math]::Round($cPct, 1)
                speed   = [Math]::Round([double]$ch.SpeedMBs, 2)
            }
        }
        $syncObj = @{
            overallPercent = [Math]::Round($overallPercent, 1)
            overallSpeed   = [Math]::Round($avgSpeedMBs, 2)
            chunks         = $syncChunks
            timestamp      = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        }
        $syncJson = $syncObj | ConvertTo-Json -Compress
        $syncPath = Join-Path $PSScriptRoot "shuja_antigravity_sync.json"
        [System.IO.File]::WriteAllText($syncPath, $syncJson)
    } catch {}

    # Check for Completion
    if ($script:sharedState.IsComplete) {
        $script:dispatcherTimer.Stop()
        $script:stopwatch.Stop()
        $script:downloadRunning = $false

        $dotStatus.Fill = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#10B981")
        $txtFooterStatus.Text = "Download Complete in $($elapsedSec.ToString('N1'))s! Checksum verified."

        $txtHashValue.Text = $script:sharedState.Sha256Hash
        $btnCopyHash.Visibility = [System.Windows.Visibility]::Visible

        # Final Anti-Gravity Sync Snapshot marking 100%
        try {
            $finalChunks = @()
            foreach ($cid in ($script:sharedState.Chunks.Keys | Sort-Object)) {
                $finalChunks += @{ id = [int]$cid; percent = 100.0; speed = 0.0 }
            }
            $finalObj = @{ overallPercent = 100.0; overallSpeed = 0.0; chunks = $finalChunks; timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
            $finalSyncPath = Join-Path $PSScriptRoot "shuja_antigravity_sync.json"
            [System.IO.File]::WriteAllText($finalSyncPath, ($finalObj | ConvertTo-Json -Compress))
        } catch {}

        Append-Log "==========================================================" "SUCCESS"
        Append-Log "DOWNLOAD & VERIFICATION COMPLETE!" "SUCCESS"
        Append-Log "File: $($script:sharedState.FinalFile)" "SUCCESS"
        Append-Log "Average Speed: $($avgSpeedMBs.ToString('N2')) MB/s | Time: $($elapsedSec.ToString('N2'))s" "SUCCESS"
        Append-Log "SHA-256 Checksum: $($script:sharedState.Sha256Hash)" "SUCCESS"
        Append-Log "==========================================================" "SUCCESS"

        Reset-UIControls

        [System.Windows.Forms.MessageBox]::Show(
            "Download completed successfully!`n`nFile: $($script:sharedState.FinalFile)`nSpeed: $($avgSpeedMBs.ToString('N2')) MB/s`nTime: $($elapsedSec.ToString('N2'))s`n`nSHA-256: $($script:sharedState.Sha256Hash)",
            "Download Complete - Shuja Downloader Pro",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    }
}

function Reset-UIControls {
    $btnStart.IsEnabled = $true
    $btnPause.IsEnabled = $false
    $btnResume.IsEnabled = $false
    $btnCancel.IsEnabled = $false
    $cmbThreads.IsEnabled = $true
    $btnBrowse.IsEnabled = $true
    $txtUrl.IsEnabled = $true
}

# -----------------------------------------------------------------------------
# Launch Application Window
# -----------------------------------------------------------------------------
$window.ShowDialog() | Out-Null
