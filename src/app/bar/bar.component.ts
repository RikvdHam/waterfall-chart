import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import cashdata from './data_files/data.json';
import { tree, Transition } from 'd3';
import { IfStmt } from '@angular/compiler';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css']
})
export class BarComponent implements OnInit {

  private svg: any;
  private margin = {top: 20, right: 80, bottom: 58, left: 100};
  private width = 500 - (this.margin.left + this.margin.right);
  private height = 230 - (this.margin.top + this.margin.bottom);
  private padding = 0.3;

  public static startingColor = '#396A93';
  public static totalColor = '#396A93';
  public static positiveColor = '#749d5b';
  public static negativeColor = '#9a3837';
  public static startingColorHover = '#4077a5'
  public static totalColorHover = '#4077a5';
  public static positiveColorHover = '#81a66b';
  public static negativeColorHover = '#a44b4b';


  private allFlatTreeNodes: Map<number, TreeNode>; // Map with all tree nodes (items) per id (position)
  private rootTreeNodes: TreeNode[];

  constructor() {
    // Save this map in its cache regarding speed issues. Quicker in searching for specific nodes than in a tree structure
    // through nested loops.
    this.allFlatTreeNodes = this.fetchAllFlatTreeNodes();
    this.rootTreeNodes = this.fetchRootTree(this.allFlatTreeNodes);
  }

  ngOnInit(): void {
    this.resetSvg();
  }

  public resetSvg() {
    let visibleTreeNodes = this.fetchVisibleTreeNodes(this.rootTreeNodes);
    let waterfallChartNodes = this.fetchWaterfallChartNodes(visibleTreeNodes);
    this.deleteSvgContent();
    this.createSvg();
    this.drawFigure(waterfallChartNodes);
  }

  private createSvg(): void {
    this.svg = d3.select("#bar")
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 500 230")
      .append("g")
      .attr("class", "svg-class")
      .attr("transform", "translate(" + (this.margin.left) + "," + (this.margin.top) + ")");
  }

  private deleteSvgContent(): void {
    d3.select('svg').remove();
  }

  private drawFigure(data: WaterfallChartNode[]): void {
    // Create the X-axis band scale
    let x = d3.scaleBand()
      .rangeRound([0, this.width])
      .domain(data.map((node: WaterfallChartNode) => node.getName()))
      .paddingInner(this.padding);   

    // Create the Y-axis band scale
    let minValue = data.reduce((min, node: WaterfallChartNode) => min = min < node.getEndingValue() ? min : node.getEndingValue(), 0);
    let maxValue = data.reduce((max, node: WaterfallChartNode) => max = max > node.getEndingValue() ? max : node.getEndingValue(), 0);
    let y = d3.scaleLinear()
      .range([this.height, 0])
      .domain([minValue, maxValue]);  

    this.drawXAxis(x);

    this.drawYAxis(y);

    this.drawBars(x, y, data);
  }

  private drawXAxis(x: any): void {
    // Draw the X-axis on the DOM    
    this.svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x))
      .style('stroke-width', '0.5px')
      .style('color', 'lightgrey')
      .selectAll(".tick text")
      .call((transition: any) => {
        transition.each((text: any, index: any, nodeList: any) => {
          let node = d3.select(nodeList[index]);
          AuxiliarlyFunctions.getLabelWrapper(x)(text, node);
          AuxiliarlyFunctions.getButtonMaker(this, this.allFlatTreeNodes)(text, node);
        });
      })
      .style("text-anchor", "middle")
      .style("font-size", "0.6em")
      .style("color", "#396A93");

    // Add X-axis title
    this.svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(0)")
      .attr("y", this.height + this.margin.bottom - 2)
      .attr("x", (this.width / 2))
      .text("Calendar Quarters 2018Q4 - 2019Q3");
  }

  private drawYAxis(y: any): void {  
    // Draw the Y-axis on the DOM
    this.svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).tickFormat(AuxiliarlyFunctions.getValueFormatter()).tickSizeOuter(0).ticks(6))
      .style('stroke-width', '0.5px')
      .style('color', 'lightgrey')
      .selectAll(".tick text")
      .style("text-anchor", "left")
      .style("font-size", "0.6em")
      .style("color", "#396A93");

    // Add Y-axis title
    this.svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -55)
      .attr("x", -this.height / 2)
      .text("US$ in Millions")
      .style("color", "#396A93");

    // Add grid
    this.svg.append("g")			
      .attr("class", "grid")
      .call(d3.axisLeft(y)
      .tickSize(-this.width)
      .tickFormat(AuxiliarlyFunctions.getEmptyFormatter()))
      .style('color', 'lightgrey')
      .style('opacity', '0.3')
      .style('stroke-width', '0.5px');
  }

  private drawBars(x: any, y: any, data: any): void {
    // Create and fill the bars
    const bar = this.svg.selectAll("bars")
      .data(data)
      .enter();

    bar
      .append("rect")
      .attr("x", (node: WaterfallChartNode) => x(node.getName()))
      .attr('y', (node: WaterfallChartNode) => {
              return y(Math.max(node.getStartingValue(), node.getEndingValue()));
            })
      .attr("width", x.bandwidth())
      .attr('height', (node: WaterfallChartNode) => {
              return Math.abs(y(node.getStartingValue()) - y(node.getEndingValue()));
            })
      .attr("fill", (node: WaterfallChartNode) => {
        if (node.getType() === BarType.STARTING) {
          return BarComponent.startingColor;
        } else if (node.getType() === BarType.TOTAL) {
          return BarComponent.totalColor;
        } else if (node.getType() === BarType.POSITIVE) {
          return BarComponent.positiveColor;
        } else if (node.getType() === BarType.NEGATIVE) {
          return BarComponent.negativeColor;
        } else {
          console.log("Error: Unknown type in filling bar colors: " + node.getType());
          return 'black';
        }
      });

    // Add the connecting line between each bar
    bar
      .append('line')
      .filter((node: WaterfallChartNode, index: number) => {
        return index != data.length - 1;
      })
      .style("stroke-dasharray", 1)
      .style("stroke", "black")
      .style("stroke-width", 1.5)
      .attr("x1", (node: WaterfallChartNode) => {
        return x(node.getName())! + x.bandwidth();
      })
      .attr("y1", (node: WaterfallChartNode) => {
        return y(node.getEndingValue());
      })
      .attr("x2", (node: WaterfallChartNode, index: any) => {
        return x(node.getName())! + x.bandwidth() + ((this.width - data.length * x.bandwidth()) / (data.length - 1));
      })
      .attr("y2", (node: WaterfallChartNode, index: number) => {
        return y(node.getEndingValue());
      })
      .style('stroke-width', '0.5px');

    // Add the value on each bar while hovering.
    bar
      .append('text')
      .attr('class', 'value-text')
      .attr('x', (node: WaterfallChartNode) => {
        return x(node.getName()) + x.bandwidth() / 2;
      })
      .attr('y', (node: WaterfallChartNode) => {
          return node.getEndingValue() >= node.getStartingValue() ? y(node.getEndingValue()) : y(node.getStartingValue());
      })
      .attr('dy', '-.5em')
      .text((node: WaterfallChartNode) => {
        return AuxiliarlyFunctions.getValueFormatter()(node.getEndingValue());
      })
      .style("text-anchor", "middle")
      .style('visibility', 'hidden')
      .style('font-size', '.5em')
      .call(() => {
        AuxiliarlyFunctions.drawValueOnHovering()();
      });
  }
  
  /**
   * This method retrieves the cashflow data stored in ./data_files/data.json. All the items plus its tree hierarchy 
   * are stored in a TreeNode object.
   * 
   * @returns a map containing all tree nodes per id (position). 
   */
  private fetchAllFlatTreeNodes(): Map<number, TreeNode> {
    // Read and store all the tree nodes (items) from the JSON file 
    let allTreeNodesMap: Map<number, TreeNode> = new Map();
    for (let item of cashdata.items) {
      let id: number = parseInt(item.position);
      if (isNaN(id)) {
        console.log("Error: item.position cannot be cast to an integer: " + item.position);
        continue;
      }
      let value = parseFloat(item.value);
      if (isNaN(value)) {
        console.log("Error: item.value cannot be cast to a float: " + item.value);
        continue;
      }
      allTreeNodesMap.set(id, new TreeNode(item.row, id, value));
    }

    // Create the tree hierarchy of all the retrieved nodes. So for every node, set its children and parent id.
    for (let parent of cashdata.tree) {
      let parentTreeNode: TreeNode | undefined = allTreeNodesMap.get(parent.position);
      if (parentTreeNode === undefined) {
        console.log("Error: Couldn't find a parent treeField for position " + parent.position);
        continue;
      }
      for (let childId of parent.children) {
        let childTreeNode: TreeNode | undefined = allTreeNodesMap.get(childId);
        if (childTreeNode === undefined) {
          console.log("Error: Couldn't find a child treeField for id " + childId);
          continue;
        }
        if (childTreeNode.getParentId() !== null) {
          console.log("Error: Child " + childTreeNode.getId() + " already has a parentId: " + childTreeNode.getParentId());
          continue;
        }
        parentTreeNode.setChild(childTreeNode);
        childTreeNode.setParentId(parentTreeNode.getId());
      }
    }

    return allTreeNodesMap;
  }

  /**
   * Restructures given tree nodes to its root nodes only.
   * 
   * @param treeNodeMap map with tree node per key that you want to reduce to its root
   * 
   * @returns The root tree nodes.
   */
  private fetchRootTree(treeNodeMap: Map<number, TreeNode> ): TreeNode[] {
    // Delete children from the map, because those are stored within their parents.
    return Array.from(treeNodeMap.values()).filter((treeNode: TreeNode) => treeNode.getParentId() === null);
  }

  private fetchVisibleTreeNodes(treeNodes: TreeNode[]): TreeNode[] {
    let visibleTreeNodes: TreeNode[] = [];
    for (let treeNode of treeNodes) {
      Array.prototype.push.apply(visibleTreeNodes, this.unwrapNode(treeNode));
    }
    return visibleTreeNodes;
  }

  private unwrapNode(treeNode: TreeNode): TreeNode[] {
    let unwrappedTreeNodes: TreeNode[] = [];
    if (treeNode.hasChildren() && !treeNode.isWrapped()) {
      for (let childNode of treeNode.getChildren()) {
        Array.prototype.push.apply(unwrappedTreeNodes, this.unwrapNode(childNode));
      }
    } else {
      unwrappedTreeNodes.push(treeNode);
    }
    return unwrappedTreeNodes;
  }

  private fetchWaterfallChartNodes(treeNodes: TreeNode[]): WaterfallChartNode[] {
    // Sort the tree nodes such that the first TreeNode will be the first bar in the chart.
    treeNodes.sort((treeNode1: TreeNode, treeNode2: TreeNode) => {
      if (treeNode1.getId() > treeNode2.getId()) {
        return 1;
      }

      if (treeNode1.getId() < treeNode2.getId()) {
        return -1;
      }
      return 0;
    });


    let waterfallChartNodes: WaterfallChartNode[] = [];
    let cumulativeValue: number = 0;
    let position: number = 0;
    let startingValue: number;
    let endingValue: number;
    for (let treeNode of treeNodes) {
      let isTotal: boolean = WaterfallChartNode.isTotal(treeNode.getName());
      if (isTotal) {
        startingValue = 0;
        endingValue = cumulativeValue;
        if (treeNode.fetchValue() != cumulativeValue) {
          console.log("Error: Cumulative value not equal to its total value. cumulativeValue: " + cumulativeValue 
          + ", treeNodeValue: " + treeNode.fetchValue());
        }
      } else {
        startingValue = cumulativeValue;
        cumulativeValue += treeNode.fetchValue();
        endingValue = cumulativeValue;
      }
      
      waterfallChartNodes.push(new WaterfallChartNode(
        treeNode.getName(), ++position, startingValue, endingValue, isTotal));
    }
    return waterfallChartNodes;
  }
}


class TreeNode {
  private name: string;
  private id: number;
  private value: number;
  private parentId: number | null;
  private children: TreeNode[];
  private wrapped: boolean;
  private startAmount: number;

  constructor(name: string, id: number, value: number) {
    this.name = name;
    this.id = id;
    this.value = value;
    this.parentId = null;
    this.children = [];
    this.wrapped = true;
    this.startAmount = 0;
  }

  public fetchValue(): number {
    return ((this.hasChildren() && this.wrapped) ? this.fetchCumValue() : this.value);
  }

  private fetchCumValue() {
    var cumValue: number = 0;
    this.children.forEach(treeField => cumValue += treeField.fetchValue());
    return cumValue;
  }

  public setChild(child: TreeNode) {
    this.children.push(child);
  }

  public hasChildren(): boolean {
    return this.children.length > 0;
  }

  public toString = () : string => {
    return `TreeField (name: ${this.name}, position: ${this.id}, value: ${this.value}, 
      children: ${this.children}, wrapped: ${this.wrapped})`;
  }

  public getName(): string {
    return this.name;
  }

  public getId(): number {
    return this.id;
  }

  public setParentId(parentId: number) {
    this.parentId = parentId;
  }

  public getParentId(): number | null {
    return this.parentId;
  }
  
  public getChildren(): ReadonlyArray<TreeNode> {
    return this.children;
  }

  public setIsWrapped(wrapped: boolean) {
    this.wrapped = wrapped;
  }

  public isWrapped(): boolean {
    return this.wrapped;
  }

  public setStartAmount(startAmount: number) {
    this.startAmount = startAmount;
  }

  public getStartAmount(): number {
    return this.startAmount;
  }
}


class WaterfallChartNode {
  private name: string;
  private position: number;
  private startingValue: number;
  private endingValue: number;
  private type: BarType;

  constructor(name: string, position: number, startingValue: number, endingValue: number, total=false) {
    this.name = name;
    this.position = position;
    this.startingValue = startingValue;
    this.endingValue = endingValue;
    this.type = this.fetchBarType(endingValue - startingValue, position === 1, total);
  }

  private fetchBarType(value: number, starting: boolean, total: boolean): BarType {
    if (starting) {
      return BarType.STARTING;
    }
    else if (total) {
      return BarType.TOTAL;
    }
    return value >= 0 ? BarType.POSITIVE : BarType.NEGATIVE;
  }

  public static isTotal(name: string): boolean {
    return name === 'Ending Cash';
  }

  public getName(): string {
    return this.name;
  }

  public getPosition(): number {
    return this.position;
  }

  public getStartingValue(): number {
    return this.startingValue;
  }

  public getEndingValue(): number {
    return this.endingValue;
  }

  public getType(): BarType {
    return this.type;
  }
}

enum BarType {
  STARTING,
  TOTAL,
  POSITIVE,
  NEGATIVE  
}


class AuxiliarlyFunctions {
  /**
   * This function formats the values. Values are represented in millions and have only 3 faction digits. 
   * Negative values are represented between brackets '()', instead of with the minus '-' sign. Values are
   * represented as the de-DE convention.
   */
  public static getValueFormatter(): (number: any) => string {
    return (number: any) => {
      if (number > 0) {
        return '' + (number / 1_000_000).toLocaleString('de-DE', {minimumFractionDigits: 3}) + 'M';
      }
      else if (number < 0) {
        return '(' + Math.abs((number / 1_000_000)).toLocaleString('de-DE', {minimumFractionDigits: 3}) + ')M';
      } else {
        return '0';
      }
    }
  }

  /**
   * This function returns an empty format.
   */
  public static getEmptyFormatter(): (number: any) => string {
    return (number: any) => {
      return '';
    }
  }

  /**
   * This function wraps x-axis labels into multiple lines if its x-range is shorter than the label text.
   */
  public static getLabelWrapper(x: any): Function {
    return (text: string, node: any) => {
      let words = text.split(/\s+/).reverse(),
        word,
        line: any[] = [],
        wordNumber = 0,
        lineNumber = 0,
        lineHeight = 1.1, // ems
        xnode = node.attr("x"),
        ynode = node.attr("y"),
        dy = parseFloat(node.attr("dy")),
        tspan = node.text(null)
          .append("tspan")
          .attr("x", xnode)
          .attr("y", ynode)
          .attr("dy", dy + "em");
      while (word = words.pop()) {
        wordNumber++;
        line.push(word);
        tspan.text(line.join(" "));
        if (node.node().getComputedTextLength() > x.bandwidth()) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = node.append("tspan")
            .attr("x", 0)
            .attr("y", ynode)
            .attr("dy", wordNumber > 1 ? ++lineNumber * lineHeight + dy + "em" : dy + "em")
            .text(word);
        }
      }
    }
  }

  /**
   * Function that creates the buttons underneath the waterfall-chart. These buttons have the functionality to
   * wrap and unwrap certain columns of the chart. 
   * 
   * @param barCompnent The BarComponent of which you want to add the functionality.
   * @param flatTreeNodes A map of all the flat tree nodes of which the waterfall-chart exists.
   */
  public static getButtonMaker(barCompnent: BarComponent, flatTreeNodes: Map<number, TreeNode>): Function {
    return (text: string, node: any) => {
      let treeNodes: TreeNode[] = Array.from(flatTreeNodes.values()).filter(node => node.getName() === text);
      if (treeNodes.length > 1) {
        console.log("Error: Multiple tree nodes found for " + text);
        return;
      }

      let currentTreeNode: TreeNode | undefined = treeNodes.pop();
      if (currentTreeNode === undefined) {
        console.log("Error: Unable to find a tree node for " + text);
        return;
      }

      let buttonWrapper = node.append("tspan");
      buttonWrapper.attr("class", "button-wrapper")
        .attr("x", 0)
        .attr("y", 9)
        .attr("dy", (5 + "em"));

      let buttonUnwrap = buttonWrapper.append('tspan');
      buttonUnwrap.attr("class", "unwrap")
        .attr('font-family', 'Font Awesome')
        .attr('font-size', '1.1em')
        .attr("class", "fa")  // Give it the font-awesome class
        .text('\uf078')
        .style('cursor', 'pointer')
        .style('display', () => {
          return currentTreeNode!.hasChildren() ? 'block' : 'none';
        })

      buttonUnwrap.on('click', () => {
        if (currentTreeNode!.getChildren().length === 0) {
          console.log("Error: No children found while there is a try for unwrapping.");
          return;
        }

        currentTreeNode!.setIsWrapped(false);
        barCompnent.resetSvg();
      });
    
      let buttonWrap = buttonWrapper.append('tspan');
      buttonWrap.attr("class", "wrap")
        .attr('dx', () => {
          return currentTreeNode!.hasChildren() && currentTreeNode!.getParentId() ? (1.5 + "em") : 0;
        })
        .attr('font-family', 'Font Awesome')
        .attr('font-size', '1.1em')
        .attr("class", "fa")  // Give it the font-awesome class
        .text('\uf077')
        .style('cursor', 'pointer')
        .style('display', () => {
          return currentTreeNode!.getParentId() ? 'block' : 'none';
        })

        buttonWrap.on('click', (d:any) => {
          if (currentTreeNode!.getParentId() === null) {
            console.log("Error: ParentId is null while there is a try for wrapping.");
            return;
          }
          let parentTreeNode: TreeNode | undefined = flatTreeNodes.get(currentTreeNode!.getParentId()!);
          if (!parentTreeNode) {
            console.log("Error: Unable to find a tree node for parentId " + currentTreeNode!.getParentId() 
              + " while there is a try for wrapping.");
            return;
          }
          parentTreeNode.setIsWrapped(true);
          barCompnent.resetSvg();
        });
    }
  }

  public static drawValueOnHovering(): () => void {
    return () => {
      let transition = d3.selectAll('rect');
      let text = d3.selectAll('.value-text');
      transition.each((node: any, index: any, rectList: any) => {
        let rect = d3.select(rectList[index]);
        rect.on('mouseover', () => {
          if (node.getType() === BarType.STARTING) {
            rect.style('fill', BarComponent.startingColorHover);
          } else if (node.getType() === BarType.TOTAL) {
            rect.style('fill', BarComponent.totalColorHover);
          } else if (node.getType() === BarType.POSITIVE) {
            rect.style('fill', BarComponent.positiveColorHover);
          } else if (node.getType() === BarType.NEGATIVE) {
            rect.style('fill', BarComponent.negativeColorHover);
          } else {
            console.log("Error: Unknown type in mouseover bar colors: " + node.getType());
            rect.style('fill', 'black');
          }
          d3.select(text.nodes()[index]!).style('visibility', 'visible');
        })

        rect.on('mouseout', () => {
          if (node.getType() === BarType.STARTING) {
            rect.style('fill', BarComponent.startingColor);
          } else if (node.getType() === BarType.TOTAL) {
            rect.style('fill', BarComponent.totalColor);
          } else if (node.getType() === BarType.POSITIVE) {
            rect.style('fill', BarComponent.positiveColor);
            } else if (node.getType() === BarType.NEGATIVE) {
            rect.style('fill', BarComponent.negativeColor);
          } else {
            console.log("Error: Unknown type in mouseout bar colors: " + node.getType());
            rect.style('fill', 'black');
          }
          d3.select(text.nodes()[index]!).style('visibility', 'hidden');
        })
      })
    };
  }
}
