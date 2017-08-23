% ************************************************************
%
%           GENERALISERA.M
%
%    Detta program är skrivet för att förenkla linjeobjekt
%    av ICOS sjömätningar.
%
% -----------------------------------------------------------------
%
%   Lars Harrie 20170705
%
% -----------------------------------------------------------------
%		Viktiga parametrar
% -----------------------------------------------------------------
% 
%    ny_linje_   	resultatet efter förenkling 
%
% -----------------------------------------------------------------
%
%		Hjälpfunktioner och program
%
%    triangleArea		räknar ut area på en triangel
%
% ************************************************************
%
clear, clf
format long;
axis('equal'), hold on;
axis('off'), hold on;
% 
% ------------------------------------------------------------
%  
%  Sätt Globala Parametrar
% 
% Maximalt antal punkter
maxNumPoints = 30;
%
%
plot_orginal = 1;
plot_forenklad = 1;
plot_box = 1;
%
% Bounding box
latMin = 1000; 
latMax = -1000;
lonMin = 1000; 
lonMax = -1000;
%
% ************************************************************
%
%         Inläsning av data och plottning av orginaldata
%         Undersökning om linjen är sluten eller öppen
%
% ************************************************************
%
% Läs in data
%
% Enkla linjer
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData.txt'
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData2.txt'
%OrgData=OrgData2;
%
% Lite komplicerade linjer
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData3.txt'
%OrgData=OrgData3;
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData4.txt'
%OrgData=OrgData4;
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData5.txt'
%OrgData=OrgData5;
%
%
% Komplicerade linjer
%
load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData6.txt'
OrgData=OrgData6;
%
[rader kolumner]=size(OrgData);
if (plot_orginal>0.5)
    for i=1:(rader-1)	
        Graphx=[OrgData(i,1), OrgData(i+1,1)];
        Graphy=[OrgData(i,2), OrgData(i+1,2)];
        plot(Graphx,Graphy,'r'),hold on
    end
end;
%
%
disp = [ 'Ursprungligt antal punkter: ', num2str(rader) ]
%
% **************************************************************************
%
% ****  Förenkla funktionen med en strömmande algoritm *****
%
tic; % Starta tidmätning
%
% Skapa en tredje kolumn som anger prioriteten på linjen
%
linje= [ OrgData, Inf(rader,1), ones(rader,1) ];
%
% Beräkna prioriet för de första maxNumPoints punkterna.
% Prioritet sätts lika med area för triangeln skapa med 
% föregående och efterföljande punkt.
% Första punkten ska aldrig raderas
for i=2:maxNumPoints	
	linje(i,3)=triangleArea( linje(i-1,1),linje(i-1,2), linje(i,1),linje(i,2), linje(i+1,1),linje(i+1,2)); 
end;
%
%
if (linje(1,1)<latMin)
    latMin=linje(1,1);
end
if (linje(1,1)>latMax)
    latMax=linje(1,1);
end
if (linje(1,2)<lonMin)
    lonMin=linje(1,2);
end
if (linje(1,2)>lonMax)
    lonMax=linje(1,2);
end
%
% Addera nästa punkt i listan samt ta bort punkt med lägst prioritet
%
for i = (maxNumPoints+1) : (rader-1)   

    if (linje(i,1)<latMin)
        latMin=linje(i,1);
    end
    if (linje(i,1)>latMax)
        latMax=linje(i,1);
    end
    if (linje(i,2)<lonMin)
        lonMin=linje(i,2);
    end
    if (linje(i,2)>lonMax)
        lonMax=linje(i,2);
    end   
    % Beräkna prioritet för den nya punkten
    % Ta fram föregående punkt som inte är raderad
    p=i-1; % Föregånde
    while (linje(p,4)<0.1)
        p=p-1;
    end;    
    linje(i,3)=triangleArea( linje(p,1),linje(p,2), linje(i,1),linje(i,2), linje(i+1,1),linje(i+1,2));
    %
    % Ta bort punkten med lägst prioritet
    [M,j] = min(abs(linje(1:i-1,3)));
    linje(j,3)=Inf; 
    linje(j,4)=0;
    % Beräkna nya prioriteter för föregående och nästa punkt
    k=j-1; % Föregånde
    while (linje(k,4)<0.1)
        k=k-1;
    end;
    m=j+1; % Nästa
    while (linje(m,4)==0)
        m=m+1;
    end
    if (k>1.5) % Om k inte är startpunkten ska den få ny prioritet
        l=k-1;
        while (linje(l,4)<0.1)
            l=l-1;
        end;        
        linje(k,3)=triangleArea( linje(l,1),linje(l,2), linje(k,1),linje(k,2), linje(m,1),linje(m,2))+M;
    end
    if (m < (rader-0.5) ) % Om m inte är slutpunkten ska den få ny prioritet
        n=m+1;
        while (linje(n,4)<0.1)
            n=n+1;
        end;        
        linje(m,3)=triangleArea( linje(k,1),linje(k,2), linje(m,1),linje(m,2), linje(n,1),linje(n,2))+M;
    end
    %
end
%
if (linje(rader,1)<latMin)
    latMin=linje(rader,1);
end
if (linje(rader,1)>latMax)
    latMax=linje(rader,1);
end
if (linje(rader,2)<lonMin)
    lonMin=linje(rader,2);
end
if (linje(rader,2)>lonMax)
    lonMax=linje(rader,2);
end
%
toc % Sluta tidmätning
%
% *****************************************************************
%
%
% Plocka ut de punkter som ska bevaras och
% lagra dem i vektorn ny_linje
% 
ny_linje=zeros(maxNumPoints,2);
j=0;
for i=1:rader
    if (linje(i,4) > 0.5)
        j=j+1;
        ny_linje(j,1:2)=linje(i,1:2);
    end
end
%
%
[rader_ny kolumner]=size(ny_linje);
disp = [ 'Förenklad linje - antal punkter: ', num2str(rader_ny) ]
%
%  Rita ut den förenklade linjen
%
if (plot_forenklad>0.5)
    for i=1:(maxNumPoints)	
        Graphx=[ny_linje(i,1), ny_linje(i+1,1)];
        Graphy=[ny_linje(i,2), ny_linje(i+1,2)];
        plot(Graphx,Graphy,'k'),hold on
    end;
end;
%
%  Rita ut bounding box
%
if (plot_box>0.5)
    Graphx=[latMin, latMin];
    Graphy=[lonMin, lonMax];
    plot(Graphx,Graphy,'g'),hold on
    Graphx=[latMin, latMax];
    Graphy=[lonMax, lonMax];
    plot(Graphx,Graphy,'g'),hold on
    Graphx=[latMax, latMax];
    Graphy=[lonMax, lonMin];
    plot(Graphx,Graphy,'g'),hold on
    Graphx=[latMax, latMin];
    Graphy=[lonMin, lonMin];
    plot(Graphx,Graphy,'g'),hold on
end;
%
%
%  ************** END ****************************************
%